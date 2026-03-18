import type { CellDiff, DiffResult, ParsedWorkbook } from '../core/types';

const ASSUMPTION_SHEET_PATTERNS = [
  /assumption/i,
  /inputs?$/i,
  /config/i,
  /parameters?/i,
  /drivers?/i,
];

const FINANCIAL_FORMAT_RE = /[$%#,0]/;

function isAssumptionSheet(name: string): boolean {
  return ASSUMPTION_SHEET_PATTERNS.some((re) => re.test(name));
}

function buildFormulaRefIndex(workbook: ParsedWorkbook): Set<string> {
  const referenced = new Set<string>();
  const cellRefRe = /\$?[A-Z]{1,3}\$?\d+/gi;

  for (const sheet of workbook.sheets) {
    for (const cell of sheet.cells.values()) {
      if (cell.formula) {
        let match: RegExpExecArray | null;
        const re = new RegExp(cellRefRe.source, 'gi');
        while ((match = re.exec(cell.formula)) !== null) {
          const ref = match[0].replace(/\$/g, '').toUpperCase();
          referenced.add(`${sheet.name}!${ref}`);
        }
      }
    }
  }

  return referenced;
}

export function detectAssumptionCells(
  diffResult: DiffResult,
  _workbookA: ParsedWorkbook,
  workbookB: ParsedWorkbook,
): CellDiff[] {
  const assumptions: CellDiff[] = [];
  const seen = new Set<string>();

  // Heuristic 1: Named assumption sheets
  for (const sheet of diffResult.sheets) {
    if (isAssumptionSheet(sheet.name)) {
      for (const row of sheet.rows) {
        if (row.type !== 'same' && !seen.has(row.address)) {
          assumptions.push(row);
          seen.add(row.address);
        }
      }
    }
  }

  // Heuristic 2: Leaf-node inputs referenced by formulas
  const refsB = buildFormulaRefIndex(workbookB);
  const sheetMapB = new Map(workbookB.sheets.map((s) => [s.name, s]));

  for (const sheet of diffResult.sheets) {
    if (isAssumptionSheet(sheet.name)) continue;

    for (const row of sheet.rows) {
      if (row.type === 'same' || seen.has(row.address)) continue;

      const cellB = sheetMapB.get(sheet.name)?.cells.get(row.address);
      if (!cellB) continue;

      // Must be non-formula numeric
      if (cellB.formula) continue;
      if (typeof cellB.value !== 'number') continue;

      const qualifiedAddr = `${sheet.name}!${row.address}`;
      if (refsB.has(qualifiedAddr)) {
        assumptions.push(row);
        seen.add(row.address);
      }
    }
  }

  // Heuristic 3: Fallback — financial-formatted non-formula numerics
  for (const sheet of diffResult.sheets) {
    if (isAssumptionSheet(sheet.name)) continue;

    for (const row of sheet.rows) {
      if (row.type === 'same' || seen.has(row.address)) continue;

      const cellB = sheetMapB.get(sheet.name)?.cells.get(row.address);
      if (!cellB) continue;
      if (cellB.formula) continue;
      if (typeof cellB.value !== 'number') continue;

      // Skip header rows (row 1)
      const rowNum = parseInt(row.address.replace(/[A-Z]+/i, ''), 10);
      if (rowNum <= 1) continue;

      if (cellB.numberFormat && FINANCIAL_FORMAT_RE.test(cellB.numberFormat)) {
        assumptions.push(row);
        seen.add(row.address);
      }
    }
  }

  return assumptions;
}
