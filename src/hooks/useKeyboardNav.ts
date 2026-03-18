import { useEffect } from 'react';
import type { CellDiff } from '../core/types';

interface UseKeyboardNavOptions {
  changes: CellDiff[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onReset: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}

export function useKeyboardNav({
  changes,
  selectedIndex,
  onSelect,
  onReset,
  searchRef,
}: UseKeyboardNavOptions) {
  useEffect(() => {
    const changeIndices = changes
      .map((c, i) => (c.type !== 'same' ? i : -1))
      .filter((i) => i !== -1);

    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Cmd/Ctrl+F → focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (isInput) return;

      if (e.key === ']') {
        e.preventDefault();
        if (changeIndices.length === 0) return;
        if (selectedIndex === null) {
          onSelect(changeIndices[0]);
        } else {
          const next = changeIndices.find((i) => i > selectedIndex);
          if (next !== undefined) onSelect(next);
        }
      }

      if (e.key === '[') {
        e.preventDefault();
        if (changeIndices.length === 0) return;
        if (selectedIndex === null) {
          onSelect(changeIndices[changeIndices.length - 1]);
        } else {
          const prev = [...changeIndices].reverse().find((i) => i < selectedIndex);
          if (prev !== undefined) onSelect(prev);
        }
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onReset();
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [changes, selectedIndex, onSelect, onReset, searchRef]);
}
