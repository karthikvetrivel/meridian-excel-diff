import type { DiffResult, CellDiff, SheetDiff, DiffType, ChangeKind } from '../core/types';
import { buildDependencyGraph } from '../core/dependencyGraph';

interface WorkerInput {
  type: 'compare';
  fileA: ArrayBuffer;
  fileB: ArrayBuffer;
  fileAName: string;
  fileBName: string;
}

interface SerializedCell {
  address: string;
  value: string | number | boolean | null;
  formula: string | null;
  numberFormat: string | null;
}

interface SerializedSheet {
  name: string;
  cells: Record<string, SerializedCell>;
}

function colToIndex(col: string): number {
  let index = 0;
  const upper = col.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

function parseAddr(addr: string): { col: number; row: number } {
  const match = addr.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return { col: 0, row: 0 };
  return { col: colToIndex(match[1]), row: parseInt(match[2], 10) };
}

function compareCellAddresses(a: string, b: string): number {
  const pa = parseAddr(a);
  const pb = parseAddr(b);
  if (pa.row !== pb.row) return pa.row - pb.row;
  return pa.col - pb.col;
}

function getCellValue(cell: any): string | number | boolean | null {
  if (cell.value === null || cell.value === undefined) return null;
  const v = cell.value;
  if (typeof v === 'object') {
    if (v.result !== undefined && v.result !== null) return v.result;
    if (v.richText) return v.richText.map((rt: any) => rt.text).join('');
    if (v.text) return v.text;
    if (v instanceof Date) return v.toISOString();
    if (v.formula) return null; // formula without computed result
    return null;
  }
  return v;
}

function getCellFormula(cell: any): string | null {
  if (cell.value && typeof cell.value === 'object' && cell.value.formula) {
    return cell.value.formula;
  }
  if (cell.formula) return cell.formula;
  return null;
}

async function parseFile(
  ExcelJS: any,
  buffer: ArrayBuffer,
  fileName: string,
): Promise<SerializedSheet[]> {
  const workbook = new ExcelJS.Workbook();
  const ext = fileName.toLowerCase().split('.').pop();

  if (ext === 'csv') {
    const blob = new Blob([buffer]);
    await workbook.csv.read(blob.stream() as any);
  } else {
    await workbook.xlsx.load(buffer);
  }

  const sheets: SerializedSheet[] = [];

  workbook.eachSheet((worksheet: any) => {
    const cells: Record<string, SerializedCell> = {};

    worksheet.eachRow({ includeEmpty: false }, (row: any) => {
      row.eachCell({ includeEmpty: false }, (cell: any) => {
        cells[cell.address] = {
          address: cell.address,
          value: getCellValue(cell),
          formula: ext === 'csv' ? null : getCellFormula(cell),
          numberFormat: ext === 'csv' ? null : (cell.numFmt || null),
        };
      });
    });

    sheets.push({
      name: ext === 'csv' ? fileName.replace(/\.[^.]+$/, '') : worksheet.name,
      cells,
    });
  });

  return sheets;
}

function stringify(v: string | number | boolean | null): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

function diffSheets(sheetsA: SerializedSheet[], sheetsB: SerializedSheet[]): SheetDiff[] {
  const nameSetA = new Set(sheetsA.map((s) => s.name));
  const nameSetB = new Set(sheetsB.map((s) => s.name));
  const mapA = new Map(sheetsA.map((s) => [s.name, s]));
  const mapB = new Map(sheetsB.map((s) => [s.name, s]));

  const allNames: string[] = [];
  for (const s of sheetsA) allNames.push(s.name);
  for (const s of sheetsB) if (!nameSetA.has(s.name)) allNames.push(s.name);

  const result: SheetDiff[] = [];

  for (const name of allNames) {
    const inA = nameSetA.has(name);
    const inB = nameSetB.has(name);

    if (inA && inB) {
      const sA = mapA.get(name)!;
      const sB = mapB.get(name)!;
      const allAddrs = new Set([...Object.keys(sA.cells), ...Object.keys(sB.cells)]);
      const rows: CellDiff[] = [];

      for (const addr of allAddrs) {
        const cA = sA.cells[addr];
        const cB = sB.cells[addr];

        if (!cA && cB) {
          rows.push({
            address: addr, type: 'add', changeKind: 'VALUE',
            oldValue: null, newValue: stringify(cB.value),
            oldFormula: null, newFormula: cB.formula,
            oldFormat: null, newFormat: cB.numberFormat,
          });
        } else if (cA && !cB) {
          rows.push({
            address: addr, type: 'rem', changeKind: 'VALUE',
            oldValue: stringify(cA.value), newValue: null,
            oldFormula: cA.formula, newFormula: null,
            oldFormat: cA.numberFormat, newFormat: null,
          });
        } else if (cA && cB) {
          const oldVal = stringify(cA.value);
          const newVal = stringify(cB.value);
          const formulaChanged = (cA.formula || '') !== (cB.formula || '');
          const valueChanged = oldVal !== newVal;
          const formatChanged = (cA.numberFormat || '') !== (cB.numberFormat || '');

          let type: DiffType = 'same';
          let changeKind: ChangeKind = null;

          if (formulaChanged) { type = 'mod'; changeKind = 'FORMULA'; }
          else if (valueChanged) { type = 'mod'; changeKind = 'VALUE'; }
          else if (formatChanged) { type = 'mod'; changeKind = 'FORMAT'; }

          rows.push({
            address: addr, type, changeKind,
            oldValue: oldVal, newValue: newVal,
            oldFormula: cA.formula, newFormula: cB.formula,
            oldFormat: cA.numberFormat, newFormat: cB.numberFormat,
          });
        }
      }

      rows.sort((a, b) => compareCellAddresses(a.address, b.address));
      const counts = { add: 0, rem: 0, mod: 0, same: 0 };
      for (const r of rows) counts[r.type]++;

      result.push({ name, status: 'compared', rows, hasChanges: counts.add + counts.rem + counts.mod > 0, counts });
    } else if (inA) {
      const sA = mapA.get(name)!;
      const rows: CellDiff[] = Object.values(sA.cells).map((c) => ({
        address: c.address, type: 'rem' as DiffType, changeKind: 'VALUE' as ChangeKind,
        oldValue: stringify(c.value), newValue: null,
        oldFormula: c.formula, newFormula: null,
        oldFormat: c.numberFormat, newFormat: null,
      }));
      rows.sort((a, b) => compareCellAddresses(a.address, b.address));
      result.push({ name, status: 'removed', rows, hasChanges: true, counts: { add: 0, rem: rows.length, mod: 0, same: 0 } });
    } else {
      const sB = mapB.get(name)!;
      const rows: CellDiff[] = Object.values(sB.cells).map((c) => ({
        address: c.address, type: 'add' as DiffType, changeKind: 'VALUE' as ChangeKind,
        oldValue: null, newValue: stringify(c.value),
        oldFormula: null, newFormula: c.formula,
        oldFormat: null, newFormat: c.numberFormat,
      }));
      rows.sort((a, b) => compareCellAddresses(a.address, b.address));
      result.push({ name, status: 'added', rows, hasChanges: true, counts: { add: rows.length, rem: 0, mod: 0, same: 0 } });
    }
  }

  return result;
}

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  try {
    const { fileA, fileB, fileAName, fileBName } = e.data;

    self.postMessage({ type: 'progress', phase: 'parsing', percent: 0 });
    const ExcelJS = await import('exceljs');

    const [sheetsA, sheetsB] = await Promise.all([
      parseFile(ExcelJS, fileA, fileAName),
      parseFile(ExcelJS, fileB, fileBName),
    ]);

    self.postMessage({ type: 'progress', phase: 'diffing', percent: 50 });

    const sheets = diffSheets(sheetsA, sheetsB);

    // Build dependency graph from File B (the "after" version)
    const depGraph = buildDependencyGraph(sheetsB);

    const result: DiffResult = {
      sheets,
      fileAName,
      fileBName,
      namedRangeDiffs: [],
      dependencyGraph: depGraph,
    };

    self.postMessage({ type: 'result', data: result });
  } catch (err: any) {
    self.postMessage({ type: 'error', message: err?.message || 'Unknown error' });
  }
};
