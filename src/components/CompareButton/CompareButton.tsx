import styles from './CompareButton.module.css';

interface CompareButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

export function CompareButton({ disabled, loading, onClick }: CompareButtonProps) {
  return (
    <button
      className={`${styles.button} ${disabled ? styles.disabled : ''}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <>
          <span className={styles.spinner} />
          Parsing…
        </>
      ) : (
        'Compare Models →'
      )}
    </button>
  );
}
