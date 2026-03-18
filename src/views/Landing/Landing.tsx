import { Header } from '../../components/Header/Header';
import { DropZone } from '../../components/DropZone/DropZone';
import { CompareButton } from '../../components/CompareButton/CompareButton';
import { useAppStore } from '../../store';
import styles from './Landing.module.css';

export default function Landing() {
  const fileA = useAppStore((s) => s.fileA);
  const fileB = useAppStore((s) => s.fileB);
  const setFileA = useAppStore((s) => s.setFileA);
  const setFileB = useAppStore((s) => s.setFileB);
  const swapFiles = useAppStore((s) => s.swapFiles);
  const startCompare = useAppStore((s) => s.startCompare);
  const view = useAppStore((s) => s.view);

  const hasFiles = fileA !== null && fileB !== null;
  const isParsing = view === 'parsing';

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={`${styles.hero} ${styles.fadeUp}`}>
          <h1 className={styles.headline}>
            Two models.{'\n'}
            One <span className={styles.accent}>truth.</span>
          </h1>
          <p className={styles.sub}>
            Drop two Excel files. See every cell and formula change — clean,
            instant, and auditable.
          </p>
        </div>

        <div className={`${styles.dropGrid} ${styles.fadeUp2}`}>
          <DropZone label="A" file={fileA} onFile={setFileA} />
          <button
            className={styles.swapBtn}
            onClick={swapFiles}
            disabled={!fileA && !fileB}
            aria-label="Swap files"
          >
            {fileA || fileB ? '⇄' : '→'}
          </button>
          <DropZone label="B" file={fileB} onFile={setFileB} />
        </div>

        <div className={`${styles.actions} ${styles.fadeUp3}`}>
          <CompareButton
            disabled={!hasFiles}
            loading={isParsing}
            onClick={startCompare}
          />
          <p className={styles.trust}>
            🔒 Your files are parsed locally. Nothing is ever uploaded.
          </p>
        </div>
      </main>
    </div>
  );
}
