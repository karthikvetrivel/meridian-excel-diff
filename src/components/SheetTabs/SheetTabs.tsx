import type { SheetDiff } from '../../core/types';
import styles from './SheetTabs.module.css';

interface SheetTabsProps {
  sheets: SheetDiff[];
  activeSheet: string;
  onSelectSheet: (name: string) => void;
}

function dotColor(sheet: SheetDiff): string {
  if (sheet.status === 'added') return 'var(--brand)';
  if (sheet.status === 'removed') return 'var(--rem-text)';
  if (sheet.hasChanges) return 'var(--mod-text)';
  return 'var(--text-disabled)';
}

export function SheetTabs({ sheets, activeSheet, onSelectSheet }: SheetTabsProps) {
  return (
    <div className={styles.bar} role="tablist">
      {sheets.map((sheet) => (
        <button
          key={sheet.name}
          role="tab"
          aria-selected={sheet.name === activeSheet}
          className={`${styles.tab} ${sheet.name === activeSheet ? styles.active : ''}`}
          onClick={() => onSelectSheet(sheet.name)}
        >
          <span
            className={styles.dot}
            style={{ background: dotColor(sheet) }}
          />
          {sheet.name}
        </button>
      ))}
    </div>
  );
}
