import { describe, it, expect } from 'vitest';
import { extractCellReferences, buildDependencyGraph, getImpactChain } from './dependencyGraph';

describe('extractCellReferences', () => {
  it('extracts simple cell refs', () => {
    const refs = extractCellReferences('B1+C1', 'Sheet1');
    expect(refs).toEqual([
      { sheet: 'Sheet1', address: 'B1' },
      { sheet: 'Sheet1', address: 'C1' },
    ]);
  });

  it('extracts absolute refs ($A$1)', () => {
    const refs = extractCellReferences('$A$1+$B$2', 'Sheet1');
    expect(refs).toEqual([
      { sheet: 'Sheet1', address: 'A1' },
      { sheet: 'Sheet1', address: 'B2' },
    ]);
  });

  it('extracts cross-sheet refs', () => {
    const refs = extractCellReferences('Assumptions!B2*1.1', 'Revenue');
    expect(refs).toEqual([{ sheet: 'Assumptions', address: 'B2' }]);
  });

  it('expands range refs (A1:A3)', () => {
    const refs = extractCellReferences('SUM(A1:A3)', 'Sheet1');
    const addrs = refs.map((r) => r.address);
    expect(addrs).toContain('A1');
    expect(addrs).toContain('A2');
    expect(addrs).toContain('A3');
    expect(refs.every((r) => r.sheet === 'Sheet1')).toBe(true);
  });

  it('expands 2D range refs (A1:B2)', () => {
    const refs = extractCellReferences('SUM(A1:B2)', 'Sheet1');
    const addrs = refs.map((r) => r.address).sort();
    expect(addrs).toEqual(['A1', 'A2', 'B1', 'B2']);
  });

  it('handles formulas with no refs', () => {
    const refs = extractCellReferences('100*1.05', 'Sheet1');
    expect(refs).toEqual([]);
  });

  it('deduplicates refs', () => {
    const refs = extractCellReferences('A1+A1+A1', 'Sheet1');
    expect(refs).toEqual([{ sheet: 'Sheet1', address: 'A1' }]);
  });
});

describe('buildDependencyGraph', () => {
  it('builds correct dependents map', () => {
    const sheets = [
      {
        name: 'Sheet1',
        cells: {
          A1: { address: 'A1', formula: null },
          A2: { address: 'A2', formula: null },
          A3: { address: 'A3', formula: 'SUM(A1:A2)' },
        },
      },
    ];
    const graph = buildDependencyGraph(sheets);

    // A1 and A2 are referenced by A3
    expect(graph.dependents['Sheet1']['A1']).toEqual([
      { sheet: 'Sheet1', address: 'A3' },
    ]);
    expect(graph.dependents['Sheet1']['A2']).toEqual([
      { sheet: 'Sheet1', address: 'A3' },
    ]);
  });

  it('handles cross-sheet references', () => {
    const sheets = [
      {
        name: 'Assumptions',
        cells: {
          B2: { address: 'B2', formula: null },
        },
      },
      {
        name: 'Revenue',
        cells: {
          C5: { address: 'C5', formula: 'Assumptions!B2*100' },
        },
      },
    ];
    const graph = buildDependencyGraph(sheets);
    expect(graph.dependents['Assumptions']['B2']).toEqual([
      { sheet: 'Revenue', address: 'C5' },
    ]);
  });
});

describe('getImpactChain', () => {
  it('returns direct and indirect dependents', () => {
    // A1 → A2 (=A1*2) → A3 (=A2+1)
    const sheets = [
      {
        name: 'S',
        cells: {
          A1: { address: 'A1', formula: null },
          A2: { address: 'A2', formula: 'A1*2' },
          A3: { address: 'A3', formula: 'A2+1' },
        },
      },
    ];
    const graph = buildDependencyGraph(sheets);
    const chain = getImpactChain(graph, 'S', 'A1');

    expect(chain.direct).toEqual([{ sheet: 'S', address: 'A2' }]);
    expect(chain.indirect).toEqual([{ sheet: 'S', address: 'A3' }]);
  });

  it('handles no dependents', () => {
    const sheets = [
      {
        name: 'S',
        cells: {
          A1: { address: 'A1', formula: null },
        },
      },
    ];
    const graph = buildDependencyGraph(sheets);
    const chain = getImpactChain(graph, 'S', 'A1');
    expect(chain.direct).toEqual([]);
    expect(chain.indirect).toEqual([]);
  });

  it('handles circular references without infinite loop', () => {
    // A1 → A2 (=A1) → A1 (=A2) — circular
    const sheets = [
      {
        name: 'S',
        cells: {
          A1: { address: 'A1', formula: 'A2' },
          A2: { address: 'A2', formula: 'A1' },
        },
      },
    ];
    const graph = buildDependencyGraph(sheets);
    const chain = getImpactChain(graph, 'S', 'A1');
    // Should not hang — BFS visited set prevents infinite loop
    expect(chain.direct.length + chain.indirect.length).toBeLessThan(10);
  });
});
