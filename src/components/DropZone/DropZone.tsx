import { useState } from 'react';
import { useFileDrop } from '../../hooks/useFileDrop';
import styles from './DropZone.module.css';

interface DropZoneProps {
  label: 'A' | 'B';
  file: File | null;
  onFile: (file: File) => void;
}

export function DropZone({ label, file, onFile }: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const isB = label === 'B';

  const { isDragging, dragHandlers, openFilePicker, inputRef, onInputChange } =
    useFileDrop({
      accept: ['.xlsx', '.xls', '.csv'],
      maxSizeMB: 20,
      onFile,
      onError: (msg) => {
        setError(msg);
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setTimeout(() => setError(null), 3000);
      },
    });

  const zoneClass = [
    styles.zone,
    isDragging ? (isB ? styles.dragB : styles.dragA) : '',
    file ? (isB ? styles.hasFileB : styles.hasFileA) : '',
    shake ? styles.shake : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={zoneClass}
      {...dragHandlers}
      onClick={openFilePicker}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFilePicker();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={onInputChange}
        className={styles.hiddenInput}
        tabIndex={-1}
      />

      {error ? (
        <>
          <svg className={styles.icon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--rem-text)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span className={styles.errorText}>{error}</span>
        </>
      ) : file ? (
        <>
          <svg className={styles.icon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isB ? 'var(--accent-b)' : 'var(--brand)'} strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className={isB ? styles.fileNameB : styles.fileNameA}>{file.name}</span>
          <span className={styles.hint}>Click or drop to replace</span>
        </>
      ) : (
        <>
          <svg className={styles.icon} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className={styles.label}>
            FILE {label} — {label === 'A' ? 'BEFORE' : 'AFTER'}
          </span>
          <span className={styles.primary}>Drop your .xlsx file here</span>
          <span className={styles.secondary}>or click to browse</span>
        </>
      )}
    </div>
  );
}
