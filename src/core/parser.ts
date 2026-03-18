import type { ParsedCell, ParsedSheet, ParsedWorkbook } from './types';

function getCellValue(cell: any): string | number | boolean | null {
  if (cell.value === null || cell.value === undefined) return null;
  const v = cell.value;
  if (typeof v === 'object') {
    if (v.result !== undefined) return v.result;
    if (v.richText) return v.richText.map((rt: any) => rt.text).join('');
    if (v.text) return v.text;
    if (v instanceof Date) return v.toISOString();
    if (v.formula) return null;
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

export async function parseWorkbook(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<ParsedWorkbook> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'csv') {
    await workbook.csv.read(new Blob([buffer]).stream() as any);
  } else {
    await workbook.xlsx.load(buffer);
  }

  const sheets: ParsedSheet[] = [];

  workbook.eachSheet((worksheet) => {
    const cells = new Map<string, ParsedCell>();

    const mergedCells = new Set<string>();
    if (worksheet.model && (worksheet.model as any).merges) {
      for (const merge of (worksheet.model as any).merges) {
        mergedCells.add(merge);
      }
    }

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const isRowHidden = row.hidden === true;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const address = cell.address;
        const isColHidden = worksheet.getColumn(colNumber).hidden === true;

        let mergeRange: string | null = null;
        if (cell.isMerged && cell.master !== cell) {
          mergeRange = cell.master.address + ':' + address;
        }

        cells.set(address, {
          address,
          value: getCellValue(cell),
          formula: ext === 'csv' ? null : getCellFormula(cell),
          formattedValue: cell.text || null,
          numberFormat:
            ext === 'csv'
              ? null
              : (cell.numFmt || null),
          mergeRange,
          hidden: isRowHidden || isColHidden,
        });
      });
    });

    sheets.push({
      name: ext === 'csv' ? fileName.replace(/\.[^.]+$/, '') : worksheet.name,
      cells,
    });
  });

  const namedRanges: Array<{ name: string; ref: string }> = [];
  if (workbook.definedNames) {
    // ExcelJS exposes defined names via model
    const model = (workbook as any).model;
    if (model?.definedNames) {
      for (const dn of model.definedNames) {
        namedRanges.push({ name: dn.name, ref: dn.ranges?.join(',') || '' });
      }
    }
  }

  return { fileName, sheets, namedRanges };
}
