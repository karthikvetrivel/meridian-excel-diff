import { useEffect } from 'react';
import { useAppStore } from '../../store';
import styles from './ErrorToast.module.css';

export function ErrorToast() {
  const errors = useAppStore((s) => s.errors);
  const dismissError = useAppStore((s) => s.dismissError);

  useEffect(() => {
    if (errors.length === 0) return;
    const timer = setTimeout(() => dismissError(0), 6000);
    return () => clearTimeout(timer);
  }, [errors, dismissError]);

  if (errors.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {errors.slice(0, 2).map((msg, i) => (
        <div key={`${msg}-${i}`} className={styles.toast}>
          <svg className={styles.icon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rem-text)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className={styles.message}>{msg}</span>
          <button className={styles.dismiss} onClick={() => dismissError(i)}>×</button>
        </div>
      ))}
    </div>
  );
}
