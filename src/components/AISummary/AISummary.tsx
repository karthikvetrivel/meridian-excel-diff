import { useState } from 'react';
import { useAppStore } from '../../store';
import { useAISummary, getStoredAPIKey, setStoredAPIKey } from '../../hooks/useAISummary';
import styles from './AISummary.module.css';

/** Button that goes in the header bar */
export function AISummaryButton() {
  const aiSummary = useAppStore((s) => s.aiSummary);
  const { generateSummary } = useAISummary();
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyValue, setKeyValue] = useState('');

  const handleClick = () => {
    const stored = getStoredAPIKey();
    if (stored) {
      generateSummary(stored);
    } else {
      setShowKeyInput(true);
    }
  };

  const handleSubmitKey = () => {
    if (!keyValue.trim()) return;
    setStoredAPIKey(keyValue.trim());
    setShowKeyInput(false);
    generateSummary(keyValue.trim());
  };

  if (aiSummary.status === 'loading') {
    return (
      <button className={`${styles.trigger} ${styles.triggerLoading}`} disabled>
        Analyzing...
      </button>
    );
  }

  if (aiSummary.status === 'done') return null;

  return (
    <>
      <button className={styles.trigger} onClick={handleClick}>
        Summarize with AI
      </button>

      {showKeyInput && (
        <div className={styles.keyOverlay} onClick={() => setShowKeyInput(false)}>
          <div className={styles.keyModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.keyTitle}>Anthropic API Key</div>
            <p className={styles.keyDesc}>
              Your key is stored in your browser only. It is sent directly to
              Anthropic's API — never to any other server.
            </p>
            <input
              className={styles.keyInput}
              type="password"
              placeholder="sk-ant-..."
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitKey()}
              autoFocus
            />
            <div className={styles.keyActions}>
              <button className={styles.keyCancel} onClick={() => setShowKeyInput(false)}>
                Cancel
              </button>
              <button
                className={styles.keySubmit}
                onClick={handleSubmitKey}
                disabled={!keyValue.trim()}
              >
                Save & Summarize
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Banner that renders as its own row below the header */
export function AISummaryBanner() {
  const aiSummary = useAppStore((s) => s.aiSummary);
  const setAISummary = useAppStore((s) => s.setAISummary);

  if (aiSummary.status === 'loading') {
    return (
      <div className={styles.banner}>
        <div className={`${styles.bannerIcon} ${styles.loading}`}>AI</div>
        <p className={styles.bannerText}>Analyzing changes across all sheets...</p>
      </div>
    );
  }

  if (aiSummary.status === 'done' && aiSummary.text) {
    return (
      <div className={styles.banner}>
        <div className={styles.bannerIcon}>AI</div>
        <p className={styles.bannerText}>{aiSummary.text}</p>
        <button
          className={styles.bannerDismiss}
          onClick={() => setAISummary({ status: 'idle', text: null })}
        >
          ×
        </button>
      </div>
    );
  }

  if (aiSummary.status === 'error') {
    return (
      <div className={`${styles.banner} ${styles.bannerError}`}>
        <div className={styles.bannerIcon}>!</div>
        <p className={styles.bannerText}>{aiSummary.text}</p>
        <button
          className={styles.bannerDismiss}
          onClick={() => setAISummary({ status: 'idle', text: null })}
        >
          ×
        </button>
      </div>
    );
  }

  return null;
}
