import type { TokenDiff } from '../../core/types';
import styles from './FormulaTokenDiff.module.css';

export function FormulaTokenDiff({ tokens }: { tokens: TokenDiff[] }) {
  return (
    <span className={styles.container}>
      {tokens.map((t, i) => (
        <span
          key={i}
          className={
            t.type === 'removed'
              ? styles.removed
              : t.type === 'added'
                ? styles.added
                : styles.same
          }
        >
          {t.token}
        </span>
      ))}
    </span>
  );
}
