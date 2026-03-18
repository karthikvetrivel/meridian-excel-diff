import styles from './EmptyState.module.css';

export function EmptyState() {
  return (
    <div className={styles.container}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <p className={styles.title}>No changes on this sheet</p>
      <p className={styles.subtitle}>Both versions are identical.</p>
    </div>
  );
}
