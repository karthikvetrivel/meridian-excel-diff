import { useRef, useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { SheetTabs } from '../../components/SheetTabs/SheetTabs';
import { SpreadsheetDiff } from '../../components/SpreadsheetDiff/SpreadsheetDiff';
import { MiniSidebar } from '../../components/MiniSidebar/MiniSidebar';
import { ImpactPanel } from '../../components/ImpactPanel/ImpactPanel';
import { CellPopover } from '../../components/CellPopover/CellPopover';
import { AISummaryButton, AISummaryBanner } from '../../components/AISummary/AISummary';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';
import { getImpactChain } from '../../core/dependencyGraph';
import styles from './Viewer.module.css';

export default function Viewer() {
  const diffResult = useAppStore((s) => s.diffResult)!;
  const activeSheet = useAppStore((s) => s.activeSheet)!;
  const setActiveSheet = useAppStore((s) => s.setActiveSheet);
  const selectedRowIndex = useAppStore((s) => s.selectedRowIndex);
  const setSelectedRow = useAppStore((s) => s.setSelectedRow);
  const inspectedCell = useAppStore((s) => s.inspectedCell);
  const setInspectedCell = useAppStore((s) => s.setInspectedCell);
  const filters = useAppStore((s) => s.filters);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const resetToLanding = useAppStore((s) => s.resetToLanding);

  const searchRef = useRef<HTMLInputElement>(null);
  const [showPopover, setShowPopover] = useState(false);

  const sheet = diffResult.sheets.find((s) => s.name === activeSheet);
  const rows = sheet?.rows ?? [];

  useKeyboardNav({
    changes: rows,
    selectedIndex: selectedRowIndex,
    onSelect: setSelectedRow,
    onReset: resetToLanding,
    searchRef,
  });

  // Compute the set of impacted cells for grid highlighting
  const impactedCells = useMemo(() => {
    if (!inspectedCell) return undefined;
    const { direct, indirect } = getImpactChain(
      diffResult.dependencyGraph,
      inspectedCell.sheetName,
      inspectedCell.diff.address,
    );
    const set = new Set<string>();
    for (const d of direct) set.add(`${d.sheet}!${d.address}`);
    for (const d of indirect) set.add(`${d.sheet}!${d.address}`);
    return set.size > 0 ? set : undefined;
  }, [inspectedCell, diffResult.dependencyGraph]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logoGroup}>
          <div className={styles.logoMark}>Δ</div>
          <span className={styles.wordmark}>
            Excel<span className={styles.wordmarkAccent}>Diff</span>
          </span>
        </div>
        <div className={styles.spacer} />
        <AISummaryButton />
        <button className={styles.resetBtn} onClick={resetToLanding}>
          ← New Diff
        </button>
      </header>

      <AISummaryBanner />

      <SheetTabs
        sheets={diffResult.sheets}
        activeSheet={activeSheet}
        onSelectSheet={setActiveSheet}
      />

      <div className={styles.body}>
        {sheet && !sheet.hasChanges ? (
          <EmptyState />
        ) : (
          <SpreadsheetDiff
            rows={rows}
            fileAName={diffResult.fileAName}
            fileBName={diffResult.fileBName}
            searchQuery={searchQuery}
            filters={filters}
            selectedRowIndex={selectedRowIndex}
            onSelectRow={setSelectedRow}
            onInspectCell={(diff) => {
              // Single click: set impact highlights + sidebar panel (no popover)
              setInspectedCell(diff ? { sheetName: activeSheet, diff } : null);
              setShowPopover(false);
            }}
            onDoubleClickCell={(diff) => {
              // Double click: open the detail popover
              setInspectedCell(diff ? { sheetName: activeSheet, diff } : null);
              setShowPopover(true);
            }}
            impactedCells={impactedCells}
            activeSheet={activeSheet}
          />
        )}
        <MiniSidebar
          sheet={sheet!}
          selectedRowIndex={selectedRowIndex}
          onSelectRow={setSelectedRow}
        >
          {inspectedCell && (
            <ImpactPanel
              diff={inspectedCell.diff}
              sheetName={inspectedCell.sheetName}
              diffResult={diffResult}
            />
          )}
        </MiniSidebar>
      </div>

      {/* Cell detail popover — only on double-click */}
      {inspectedCell && showPopover && (
        <CellPopover
          diff={inspectedCell.diff}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  );
}
