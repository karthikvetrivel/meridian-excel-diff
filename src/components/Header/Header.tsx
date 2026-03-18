import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logoGroup}>
        <div className={styles.logoMark}>Δ</div>
        <span className={styles.wordmark}>
          Excel<span className={styles.wordmarkAccent}>Diff</span>
        </span>
      </div>
      <div className={styles.spacer} />
      <div className={styles.privacyBadge}>
        <span className={styles.lock}>🔒</span> Files never leave your browser
      </div>
    </header>
  );
}
