/**
 * Dependency Graph for Excel formulas.
 *
 * Builds a directed graph from formula cell references:
 *   dependents[addr] = list of cells whose formulas reference `addr`
 *
 * Example: if C5 has formula =SUM(C2:C4), then:
 *   dependents["C2"] includes "C5"
 *   dependents["C3"] includes "C5"
 *   dependents["C4"] includes "C5"
 *
 *         C2 ──┐
 *         C3 ──┼──▶ C5 (=SUM(C2:C4))
 *         C4 ──┘
 */

// Matches cell references: A1, $A$1, Sheet1!A1, A1:B10
const CELL_REF_RE = /(?:([A-Za-z0-9_]+)!)?\$?([A-Z]{1,3})\$?(\d+)/gi;

/** Parse a range like A1:B3 into individual cell addresses */
function expandRange(
  startCol: string,
  startRow: number,
  endCol: string,
  endRow: number,
): string[] {
  const addrs: string[] = [];
  const sc = colToNum(startCol);
  const ec = colToNum(endCol);
  const sr = Math.min(startRow, endRow);
  const er = Math.max(startRow, endRow);
  for (let r = sr; r <= er; r++) {
    for (let c = Math.min(sc, ec); c <= Math.max(sc, ec); c++) {
      addrs.push(numToCol(c) + r);
    }
  }
  return addrs;
}

function colToNum(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function numToCol(n: number): string {
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const RANGE_RE =
  /(?:([A-Za-z0-9_]+)!)?\$?([A-Z]{1,3})\$?(\d+):\$?([A-Z]{1,3})\$?(\d+)/gi;

/**
 * Extract all cell addresses referenced by a formula string.
 * Handles: A1, $A$1, Sheet1!A1, A1:B10 ranges.
 */
export function extractCellReferences(
  formula: string,
  currentSheet: string,
): Array<{ sheet: string; address: string }> {
  const refs: Array<{ sheet: string; address: string }> = [];
  const seen = new Set<string>();

  // First pass: expand ranges
  let rangeMatch: RegExpExecArray | null;
  const rangeRe = new RegExp(RANGE_RE.source, 'gi');
  const rangeSpans: Array<[number, number]> = [];

  while ((rangeMatch = rangeRe.exec(formula)) !== null) {
    const sheet = rangeMatch[1] || currentSheet;
    const startCol = rangeMatch[2].toUpperCase();
    const startRow = parseInt(rangeMatch[3], 10);
    const endCol = rangeMatch[4].toUpperCase();
    const endRow = parseInt(rangeMatch[5], 10);
    rangeSpans.push([rangeMatch.index, rangeRe.lastIndex]);

    for (const addr of expandRange(startCol, startRow, endCol, endRow)) {
      const key = `${sheet}!${addr}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ sheet, address: addr });
      }
    }
  }

  // Second pass: individual cell refs (skip those inside ranges)
  const cellRe = new RegExp(CELL_REF_RE.source, 'gi');
  let cellMatch: RegExpExecArray | null;
  while ((cellMatch = cellRe.exec(formula)) !== null) {
    // Skip if this match falls inside a range span
    const pos = cellMatch.index;
    if (rangeSpans.some(([s, e]) => pos >= s && pos < e)) continue;

    const sheet = cellMatch[1] || currentSheet;
    const col = cellMatch[2].toUpperCase();
    const row = parseInt(cellMatch[3], 10);
    const addr = col + row;
    const key = `${sheet}!${addr}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ sheet, address: addr });
    }
  }

  return refs;
}

export interface DependencyGraph {
  /** dependents[sheetName][cellAddr] = list of {sheet, addr} that depend on this cell */
  dependents: Record<string, Record<string, Array<{ sheet: string; address: string }>>>;
}

interface CellWithFormula {
  address: string;
  formula: string | null;
}

interface SheetCells {
  name: string;
  cells: Record<string, CellWithFormula>;
}

/**
 * Build a dependency graph from parsed sheet data.
 * For each formula cell, extract its references and record the reverse mapping:
 * "cell X is referenced by cell Y" → dependents[X] includes Y.
 */
export function buildDependencyGraph(sheets: SheetCells[]): DependencyGraph {
  const dependents: Record<string, Record<string, Array<{ sheet: string; address: string }>>> = {};

  // Initialize sheets
  for (const sheet of sheets) {
    dependents[sheet.name] = {};
  }

  // For each formula cell, find what it references
  for (const sheet of sheets) {
    for (const cell of Object.values(sheet.cells)) {
      if (!cell.formula) continue;

      const refs = extractCellReferences(cell.formula, sheet.name);
      for (const ref of refs) {
        if (!dependents[ref.sheet]) dependents[ref.sheet] = {};
        if (!dependents[ref.sheet][ref.address]) {
          dependents[ref.sheet][ref.address] = [];
        }
        dependents[ref.sheet][ref.address].push({
          sheet: sheet.name,
          address: cell.address,
        });
      }
    }
  }

  return { dependents };
}

/**
 * Get all downstream cells affected by a change to the given cell.
 * Returns direct dependents and indirect (transitive) dependents.
 * Uses BFS to avoid cycles.
 */
export function getImpactChain(
  graph: DependencyGraph,
  sheetName: string,
  cellAddress: string,
): {
  direct: Array<{ sheet: string; address: string }>;
  indirect: Array<{ sheet: string; address: string }>;
} {
  const direct = graph.dependents[sheetName]?.[cellAddress] ?? [];
  const indirect: Array<{ sheet: string; address: string }> = [];
  const visited = new Set<string>();
  visited.add(`${sheetName}!${cellAddress}`);

  // BFS from direct dependents
  const queue = [...direct];
  for (const d of direct) visited.add(`${d.sheet}!${d.address}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const nextDeps = graph.dependents[current.sheet]?.[current.address] ?? [];
    for (const next of nextDeps) {
      const key = `${next.sheet}!${next.address}`;
      if (!visited.has(key)) {
        visited.add(key);
        indirect.push(next);
        queue.push(next);
      }
    }
  }

  return { direct, indirect };
}
