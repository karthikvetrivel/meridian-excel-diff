import type { SheetDiff } from '../../core/types';
import styles from './MiniSidebar.module.css';

interface MiniSidebarProps {
  sheet: SheetDiff;
  selectedRowIndex: number | null;
  onSelectRow: (index: number) => void;
  children?: React.ReactNode;
}

const DOT_COLORS: Record<string, string> = {
  add: 'var(--brand)',
  rem: 'var(--rem-text)',
  mod: 'var(--mod-text)',
};

export function MiniSidebar({ sheet, selectedRowIndex, onSelectRow, children }: MiniSidebarProps) {
  const changes = sheet.rows
    .map((c, i) => ({ ...c, idx: i }))
    .filter((c) => c.type !== 'same');

  return (
    <aside className={styles.sidebar}>
      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: 'var(--mod-text)' }}>
            {sheet.counts.mod}
          </span>
          <span className={styles.statLabel}>modified</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: 'var(--brand)' }}>
            {sheet.counts.add}
          </span>
          <span className={styles.statLabel}>added</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: 'var(--rem-text)' }}>
            {sheet.counts.rem}
          </span>
          <span className={styles.statLabel}>removed</span>
        </div>
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Change list header */}
      <div className={styles.listHeader}>
        CHANGES
        <span className={styles.listCount}>{changes.length}</span>
      </div>

      {/* Impact panel slot */}
      {children}

      {/* Change list */}
      <div className={styles.list}>
        {changes.map((c) => (
          <button
            key={c.address}
            className={`${styles.item} ${selectedRowIndex === c.idx ? styles.itemActive : ''}`}
            onClick={() => onSelectRow(c.idx)}
          >
            <span className={styles.dot} style={{ background: DOT_COLORS[c.type] }} />
            <span className={styles.addr}>{c.address}</span>
            <span className={styles.preview}>
              {c.type === 'mod'
                ? `${truncate(c.oldValue)} → ${truncate(c.newValue)}`
                : c.type === 'add'
                  ? truncate(c.newValue)
                  : truncate(c.oldValue)}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function truncate(val: string | null, len = 12): string {
  if (!val) return '—';
  return val.length > len ? val.slice(0, len) + '…' : val;
}
