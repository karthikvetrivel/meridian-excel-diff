import { parseAddress } from '../utils/cellAddress';
import type { CellDiff } from './types';

export { parseAddress };

export function compareCellAddresses(a: string, b: string): number {
  const pa = parseAddress(a);
  const pb = parseAddress(b);
  if (pa.row !== pb.row) return pa.row - pb.row;
  return pa.col - pb.col;
}

export function sortCellDiffs(diffs: CellDiff[]): CellDiff[] {
  return [...diffs].sort((a, b) => compareCellAddresses(a.address, b.address));
}
