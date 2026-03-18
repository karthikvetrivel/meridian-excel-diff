import type {
  ParsedWorkbook,
  ParsedSheet,
  CellDiff,
  SheetDiff,
  DiffResult,
  DiffType,
  ChangeKind,
} from './types';
import { sortCellDiffs } from './sorter';

function stringifyValue(v: string | number | boolean | null): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

function diffCells(sheetA: ParsedSheet, sheetB: ParsedSheet): CellDiff[] {
  const allAddresses = new Set<string>();
  for (const addr of sheetA.cells.keys()) allAddresses.add(addr);
  for (const addr of sheetB.cells.keys()) allAddresses.add(addr);

  const diffs: CellDiff[] = [];

  for (const addr of allAddresses) {
    const cellA = sheetA.cells.get(addr);
    const cellB = sheetB.cells.get(addr);

    if (!cellA && cellB) {
      diffs.push({
        address: addr,
        type: 'add',
        changeKind: 'VALUE',
        oldValue: null,
        newValue: stringifyValue(cellB.value),
        oldFormula: null,
        newFormula: cellB.formula,
        oldFormat: null,
        newFormat: cellB.numberFormat,
      });
    } else if (cellA && !cellB) {
      diffs.push({
        address: addr,
        type: 'rem',
        changeKind: 'VALUE',
        oldValue: stringifyValue(cellA.value),
        newValue: null,
        oldFormula: cellA.formula,
        newFormula: null,
        oldFormat: cellA.numberFormat,
        newFormat: null,
      });
    } else if (cellA && cellB) {
      const oldVal = stringifyValue(cellA.value);
      const newVal = stringifyValue(cellB.value);
      const formulaChanged = (cellA.formula || '') !== (cellB.formula || '');
      const valueChanged = oldVal !== newVal;
      const formatChanged = (cellA.numberFormat || '') !== (cellB.numberFormat || '');

      let type: DiffType = 'same';
      let changeKind: ChangeKind = null;

      if (formulaChanged) {
        type = 'mod';
        changeKind = 'FORMULA';
      } else if (valueChanged) {
        type = 'mod';
        changeKind = 'VALUE';
      } else if (formatChanged) {
        type = 'mod';
        changeKind = 'FORMAT';
      }

      diffs.push({
        address: addr,
        type,
        changeKind,
        oldValue: oldVal,
        newValue: newVal,
        oldFormula: cellA.formula,
        newFormula: cellB.formula,
        oldFormat: cellA.numberFormat,
        newFormat: cellB.numberFormat,
      });
    }
  }

  return sortCellDiffs(diffs);
}

function diffSheets(
  sheetsA: ParsedSheet[],
  sheetsB: ParsedSheet[],
): SheetDiff[] {
  const nameSetA = new Set(sheetsA.map((s) => s.name));
  const nameSetB = new Set(sheetsB.map((s) => s.name));
  const sheetMapA = new Map(sheetsA.map((s) => [s.name, s]));
  const sheetMapB = new Map(sheetsB.map((s) => [s.name, s]));

  const result: SheetDiff[] = [];

  // Process all sheet names in order (A sheets first, then B-only)
  const allNames: string[] = [];
  for (const s of sheetsA) allNames.push(s.name);
  for (const s of sheetsB) {
    if (!nameSetA.has(s.name)) allNames.push(s.name);
  }

  for (const name of allNames) {
    const inA = nameSetA.has(name);
    const inB = nameSetB.has(name);

    if (inA && inB) {
      const rows = diffCells(sheetMapA.get(name)!, sheetMapB.get(name)!);
      const counts = { add: 0, rem: 0, mod: 0, same: 0 };
      for (const r of rows) counts[r.type]++;
      result.push({
        name,
        status: 'compared',
        rows,
        hasChanges: counts.add + counts.rem + counts.mod > 0,
        counts,
      });
    } else if (inA && !inB) {
      const sA = sheetMapA.get(name)!;
      const rows: CellDiff[] = [];
      for (const cell of sA.cells.values()) {
        rows.push({
          address: cell.address,
          type: 'rem',
          changeKind: 'VALUE',
          oldValue: stringifyValue(cell.value),
          newValue: null,
          oldFormula: cell.formula,
          newFormula: null,
          oldFormat: cell.numberFormat,
          newFormat: null,
        });
      }
      const sorted = sortCellDiffs(rows);
      result.push({
        name,
        status: 'removed',
        rows: sorted,
        hasChanges: true,
        counts: { add: 0, rem: sorted.length, mod: 0, same: 0 },
      });
    } else {
      const sB = sheetMapB.get(name)!;
      const rows: CellDiff[] = [];
      for (const cell of sB.cells.values()) {
        rows.push({
          address: cell.address,
          type: 'add',
          changeKind: 'VALUE',
          oldValue: null,
          newValue: stringifyValue(cell.value),
          oldFormula: null,
          newFormula: cell.formula,
          oldFormat: null,
          newFormat: cell.numberFormat,
        });
      }
      const sorted = sortCellDiffs(rows);
      result.push({
        name,
        status: 'added',
        rows: sorted,
        hasChanges: true,
        counts: { add: sorted.length, rem: 0, mod: 0, same: 0 },
      });
    }
  }

  return result;
}

export function computeDiff(
  workbookA: ParsedWorkbook,
  workbookB: ParsedWorkbook,
): DiffResult {
  const sheets = diffSheets(workbookA.sheets, workbookB.sheets);

  // Named range diffs
  const namedA = new Map(workbookA.namedRanges.map((nr) => [nr.name, nr.ref]));
  const namedB = new Map(workbookB.namedRanges.map((nr) => [nr.name, nr.ref]));
  const allNames = new Set([...namedA.keys(), ...namedB.keys()]);

  const namedRangeDiffs: DiffResult['namedRangeDiffs'] = [];
  for (const name of allNames) {
    const refA = namedA.get(name) ?? null;
    const refB = namedB.get(name) ?? null;
    if (refA && !refB) {
      namedRangeDiffs.push({ name, type: 'rem', oldRef: refA, newRef: null });
    } else if (!refA && refB) {
      namedRangeDiffs.push({ name, type: 'add', oldRef: null, newRef: refB });
    } else if (refA !== refB) {
      namedRangeDiffs.push({ name, type: 'mod', oldRef: refA, newRef: refB });
    }
  }

  return {
    sheets,
    fileAName: workbookA.fileName,
    fileBName: workbookB.fileName,
    dependencyGraph: { dependents: {} },
    namedRangeDiffs,
  };
}
