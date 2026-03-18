import type { CellDiff, DiffResult } from '../../core/types';
import { getImpactChain } from '../../core/dependencyGraph';
import { useMemo } from 'react';
import styles from './ImpactPanel.module.css';

interface ImpactPanelProps {
  diff: CellDiff;
  sheetName: string;
  diffResult: DiffResult;
}

export function ImpactPanel({ diff, sheetName, diffResult }: ImpactPanelProps) {
  const graph = diffResult.dependencyGraph;

  const { direct, indirect } = useMemo(
    () => getImpactChain(graph, sheetName, diff.address),
    [graph, sheetName, diff.address],
  );

  // Look up values for dependent cells from the diff data
  function findCellDiff(sheet: string, addr: string): CellDiff | undefined {
    const s = diffResult.sheets.find((s) => s.name === sheet);
    return s?.rows.find((r) => r.address === addr);
  }

  function formatDelta(cellDiff: CellDiff | undefined): string {
    if (!cellDiff) return '';
    if (cellDiff.type === 'same') return '(unchanged)';
    const oldNum = parseFloat(cellDiff.oldValue ?? '');
    const newNum = parseFloat(cellDiff.newValue ?? '');
    if (!isNaN(oldNum) && !isNaN(newNum)) {
      const delta = newNum - oldNum;
      const sign = delta >= 0 ? '+' : '';
      return `${sign}${delta.toLocaleString()}`;
    }
    if (cellDiff.oldValue !== cellDiff.newValue) {
      return `${cellDiff.oldValue ?? '—'} → ${cellDiff.newValue ?? '—'}`;
    }
    return '';
  }

  if (direct.length === 0 && indirect.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          Impact of <span className={styles.addr}>{diff.address}</span>
        </div>
        <div className={styles.empty}>
          No downstream dependents found.
          <span className={styles.emptyHint}>
            This cell is not referenced by any formulas.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        Impact of <span className={styles.addr}>{diff.address}</span>
      </div>

      {/* Source cell change */}
      <div className={styles.source}>
        <span className={styles.sourceAddr}>{diff.address}</span>
        <span className={styles.sourceChange}>
          {diff.oldValue ?? '—'} → {diff.newValue ?? '—'}
        </span>
      </div>

      {/* Direct dependents */}
      {direct.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            DIRECTLY AFFECTS ({direct.length})
          </div>
          {direct.map((dep) => {
            const cd = findCellDiff(dep.sheet, dep.address);
            return (
              <div key={`${dep.sheet}!${dep.address}`} className={styles.depRow}>
                <span className={styles.arrow}>→</span>
                <span className={styles.depAddr}>
                  {dep.sheet !== sheetName ? `${dep.sheet}!` : ''}
                  {dep.address}
                </span>
                <span className={styles.depDelta}>{formatDelta(cd)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Indirect dependents */}
      {indirect.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            INDIRECTLY AFFECTS ({indirect.length})
          </div>
          {indirect.map((dep) => {
            const cd = findCellDiff(dep.sheet, dep.address);
            return (
              <div key={`${dep.sheet}!${dep.address}`} className={styles.depRow}>
                <span className={styles.arrowIndirect}>⤳</span>
                <span className={styles.depAddr}>
                  {dep.sheet !== sheetName ? `${dep.sheet}!` : ''}
                  {dep.address}
                </span>
                <span className={styles.depDelta}>{formatDelta(cd)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
