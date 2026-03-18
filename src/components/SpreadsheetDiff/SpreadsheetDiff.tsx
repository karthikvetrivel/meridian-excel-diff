import { useMemo, useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CellDiff, FilterState } from '../../core/types';
import { colToIndex, indexToCol } from '../../utils/cellAddress';
import styles from './SpreadsheetDiff.module.css';

interface SpreadsheetDiffProps {
  rows: CellDiff[];
  fileAName: string;
  fileBName: string;
  searchQuery: string;
  filters: FilterState;
  selectedRowIndex: number | null;
  onSelectRow: (index: number | null) => void;
  onInspectCell?: (diff: CellDiff | null) => void;
  onDoubleClickCell?: (diff: CellDiff | null) => void;
  /** Set of "SheetName!CellAddr" strings that are impacted by the inspected cell */
  impactedCells?: Set<string>;
  /** Current sheet name (for matching impactedCells) */
  activeSheet?: string;
}

interface GridCell {
  diff: CellDiff;
  diffIndex: number;
}

function parseAddr(addr: string): { col: number; row: number } {
  const match = addr.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return { col: 0, row: 0 };
  return { col: colToIndex(match[1]), row: parseInt(match[2], 10) };
}

function getCellClass(diff: CellDiff, side: 'left' | 'right'): string {
  switch (diff.type) {
    case 'add':
      return side === 'right' ? styles.cellAdded : styles.cellGhost;
    case 'rem':
      return side === 'left' ? styles.cellRemoved : styles.cellGhost;
    case 'mod':
      return styles.cellModified;
    default:
      return '';
  }
}

function getCellDisplay(diff: CellDiff, side: 'left' | 'right'): string {
  if (side === 'left') {
    if (diff.type === 'add') return '';
    if (diff.oldFormula) return `=${diff.oldFormula}`;
    return diff.oldValue ?? '';
  } else {
    if (diff.type === 'rem') return '';
    if (diff.newFormula) return `=${diff.newFormula}`;
    return diff.newValue ?? '';
  }
}

export function SpreadsheetDiff({
  rows,
  fileAName,
  fileBName,
  searchQuery,
  filters,
  selectedRowIndex,
  onSelectRow,
  onInspectCell,
  onDoubleClickCell,
  impactedCells,
  activeSheet,
}: SpreadsheetDiffProps) {
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  // Filter
  const filteredRows = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return rows.filter((r) => {
      if (r.type === 'add' && !filters.showAdded) return false;
      if (r.type === 'rem' && !filters.showRemoved) return false;
      if (r.type === 'mod' && !filters.showModified) return false;
      if (r.type === 'same' && !filters.showUnchanged) return false;
      if (r.type === 'mod' && r.changeKind) {
        if (r.changeKind === 'FORMULA' && !filters.showFormula) return false;
        if (r.changeKind === 'VALUE' && !filters.showValue) return false;
        if (r.changeKind === 'FORMAT' && !filters.showFormat) return false;
      }
      if (query) {
        const matchAddr = r.address.toLowerCase().includes(query);
        const matchOld = r.oldValue?.toLowerCase().includes(query);
        const matchNew = r.newValue?.toLowerCase().includes(query);
        if (!matchAddr && !matchOld && !matchNew) return false;
      }
      return true;
    });
  }, [rows, filters, searchQuery]);

  // Build grid
  const { grid, maxRow, maxCol } = useMemo(() => {
    const grid = new Map<string, GridCell>();
    let maxRow = 0;
    let maxCol = 0;
    filteredRows.forEach((diff, index) => {
      const { col, row } = parseAddr(diff.address);
      if (row > maxRow) maxRow = row;
      if (col > maxCol) maxCol = col;
      grid.set(diff.address, { diff, diffIndex: index });
    });
    return { grid, maxRow, maxCol };
  }, [filteredRows]);

  const ROW_HEIGHT = 30;
  const COL_WIDTH = 130;
  const ROW_HEADER_WIDTH = 40;

  const rowVirtualizer = useVirtualizer({
    count: maxRow,
    getScrollElement: () => leftScrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  // Sync scroll
  const syncScroll = useCallback((source: 'left' | 'right') => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    const from = source === 'left' ? leftScrollRef.current : rightScrollRef.current;
    const to = source === 'left' ? rightScrollRef.current : leftScrollRef.current;
    if (from && to) {
      to.scrollTop = from.scrollTop;
      to.scrollLeft = from.scrollLeft;
    }
    requestAnimationFrame(() => { isSyncing.current = false; });
  }, []);

  useEffect(() => {
    const leftEl = leftScrollRef.current;
    const rightEl = rightScrollRef.current;
    const onLeft = () => syncScroll('left');
    const onRight = () => syncScroll('right');
    leftEl?.addEventListener('scroll', onLeft);
    rightEl?.addEventListener('scroll', onRight);
    return () => {
      leftEl?.removeEventListener('scroll', onLeft);
      rightEl?.removeEventListener('scroll', onRight);
    };
  }, [syncScroll]);

  const colHeaders = useMemo(() => {
    const h: string[] = [];
    for (let c = 0; c <= maxCol; c++) h.push(indexToCol(c));
    return h;
  }, [maxCol]);

  const totalWidth = ROW_HEADER_WIDTH + (maxCol + 1) * COL_WIDTH;

  function renderGrid(side: 'left' | 'right', scrollRef: React.RefObject<HTMLDivElement | null>, fileName: string) {
    return (
      <div className={styles.panel}>
        <div className={`${styles.panelLabel} ${side === 'left' ? styles.panelLabelA : styles.panelLabelB}`}>
          {fileName}
        </div>

        <div className={styles.colHeaderRow}>
          <div className={styles.corner} style={{ width: ROW_HEADER_WIDTH }} />
          {colHeaders.map((h) => (
            <div key={h} className={styles.colHeader} style={{ width: COL_WIDTH }}>{h}</div>
          ))}
        </div>

        <div ref={scrollRef} className={styles.gridBody}>
          <div style={{ height: rowVirtualizer.getTotalSize(), width: totalWidth, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((vRow) => {
              const rowNum = vRow.index + 1;
              let rowChanged = false;
              for (let c = 0; c <= maxCol; c++) {
                const cell = grid.get(`${indexToCol(c)}${rowNum}`);
                if (cell && cell.diff.type !== 'same') { rowChanged = true; break; }
              }

              return (
                <div
                  key={vRow.index}
                  className={`${styles.row} ${rowChanged ? styles.rowChanged : ''}`}
                  style={{
                    position: 'absolute',
                    top: vRow.start,
                    height: ROW_HEIGHT,
                    width: totalWidth,
                  }}
                >
                  <div className={styles.rowNum} style={{ width: ROW_HEADER_WIDTH }}>{rowNum}</div>
                  {colHeaders.map((colLetter, ci) => {
                    const addr = `${colLetter}${rowNum}`;
                    const cell = grid.get(addr);
                    const diff = cell?.diff;
                    const cls = diff ? getCellClass(diff, side) : '';
                    const val = diff ? getCellDisplay(diff, side) : '';
                    const selected = cell && selectedRowIndex === cell.diffIndex;

                    // Check if this cell is impacted by the inspected cell
                    const isImpacted = impactedCells && activeSheet
                      ? impactedCells.has(`${activeSheet}!${addr}`)
                      : false;

                    return (
                      <div
                        key={ci}
                        className={`${styles.cell} ${cls} ${selected ? styles.cellSelected : ''} ${isImpacted ? styles.cellImpacted : ''}`}
                        style={{ width: COL_WIDTH }}
                        onClick={() => {
                          if (cell) {
                            onSelectRow(cell.diffIndex);
                            if (cell.diff.type !== 'same' && onInspectCell) {
                              onInspectCell(cell.diff);
                            }
                          }
                        }}
                        onDoubleClick={() => {
                          if (cell && cell.diff.type !== 'same' && onDoubleClickCell) {
                            onDoubleClickCell(cell.diff);
                          }
                        }}
                        title={val.length > 12 ? val : undefined}
                      >
                        {val}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {renderGrid('left', leftScrollRef, fileAName)}
      <div className={styles.gutter} />
      {renderGrid('right', rightScrollRef, fileBName)}
    </div>
  );
}
