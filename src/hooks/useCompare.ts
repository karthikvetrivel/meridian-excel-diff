import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store';

export function useCompare() {
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fileA = useAppStore((s) => s.fileA);
  const fileB = useAppStore((s) => s.fileB);
  const view = useAppStore((s) => s.view);
  const setParseProgress = useAppStore((s) => s.setParseProgress);
  const setDiffResult = useAppStore((s) => s.setDiffResult);
  const addError = useAppStore((s) => s.addError);
  const resetToLanding = useAppStore((s) => s.resetToLanding);

  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (view !== 'parsing' || !fileA || !fileB) return;

    cleanup();

    const worker = new Worker(
      new URL('../worker/diffWorker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        setParseProgress({ phase: msg.phase, percent: msg.percent });
      } else if (msg.type === 'result') {
        cleanup();
        setDiffResult(msg.data);
      } else if (msg.type === 'error') {
        cleanup();
        addError(msg.message || 'Something went wrong. Please try again.');
        resetToLanding();
      }
    };

    worker.onerror = () => {
      cleanup();
      addError('Something went wrong. Please try again.');
      resetToLanding();
    };

    // 30s timeout
    timeoutRef.current = setTimeout(() => {
      cleanup();
      addError('Processing timed out. Try smaller files.');
      resetToLanding();
    }, 30000);

    // Read files and send to worker
    Promise.all([fileA.arrayBuffer(), fileB.arrayBuffer()])
      .then(([bufA, bufB]) => {
        worker.postMessage({
          type: 'compare',
          fileA: bufA,
          fileB: bufB,
          fileAName: fileA.name,
          fileBName: fileB.name,
        }, [bufA, bufB]);
      })
      .catch((err) => {
        cleanup();
        addError(err?.message || 'Failed to read files.');
        resetToLanding();
      });

    return cleanup;
  }, [view, fileA, fileB, cleanup, setParseProgress, setDiffResult, addError, resetToLanding]);
}
