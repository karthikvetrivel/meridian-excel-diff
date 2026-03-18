// ── Shared type definitions for ExcelDiff ──

export interface ParsedCell {
  address: string;
  value: string | number | boolean | null;
  formula: string | null;
  formattedValue: string | null;
  numberFormat: string | null;
  mergeRange: string | null;
  hidden: boolean;
}

export interface ParsedSheet {
  name: string;
  cells: Map<string, ParsedCell>;
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: ParsedSheet[];
  namedRanges: Array<{ name: string; ref: string }>;
}

export type SheetStatus = 'added' | 'removed' | 'compared';
export type DiffType = 'add' | 'rem' | 'mod' | 'same';
export type ChangeKind = 'VALUE' | 'FORMULA' | 'FORMAT' | null;

export interface CellDiff {
  address: string;
  type: DiffType;
  changeKind: ChangeKind;
  oldValue: string | null;
  newValue: string | null;
  oldFormula: string | null;
  newFormula: string | null;
  oldFormat: string | null;
  newFormat: string | null;
}

export interface SheetDiff {
  name: string;
  status: SheetStatus;
  rows: CellDiff[];
  hasChanges: boolean;
  counts: { add: number; rem: number; mod: number; same: number };
}

export interface DiffResult {
  sheets: SheetDiff[];
  fileAName: string;
  fileBName: string;
  namedRangeDiffs: Array<{
    name: string;
    type: DiffType;
    oldRef: string | null;
    newRef: string | null;
  }>;
  /** Dependency graph: dependents[sheet][cell] = cells that reference this cell */
  dependencyGraph: SerializedDependencyGraph;
}

export interface SerializedDependencyGraph {
  dependents: Record<string, Record<string, Array<{ sheet: string; address: string }>>>;
}

export interface TokenDiff {
  token: string;
  type: 'same' | 'added' | 'removed';
}

export interface FilterState {
  showAdded: boolean;
  showRemoved: boolean;
  showModified: boolean;
  showUnchanged: boolean;
  showFormula: boolean;
  showValue: boolean;
  showFormat: boolean;
}
