import { create } from 'zustand';
import type { DiffResult, FilterState, CellDiff } from './core/types';

interface AppStore {
  view: 'landing' | 'parsing' | 'viewer';
  fileA: File | null;
  fileB: File | null;
  parseProgress: { phase: 'idle' | 'parsing' | 'diffing'; percent: number };
  diffResult: DiffResult | null;
  activeSheet: string | null;
  selectedRowIndex: number | null;

  /** The CellDiff for the currently inspected cell (popover + impact panel) */
  inspectedCell: { sheetName: string; diff: CellDiff } | null;

  /** AI summary state */
  aiSummary: { status: 'idle' | 'loading' | 'done' | 'error'; text: string | null };

  filters: FilterState;
  searchQuery: string;
  sidebarCollapsed: boolean;
  errors: string[];

  setFileA: (file: File | null) => void;
  setFileB: (file: File | null) => void;
  swapFiles: () => void;
  startCompare: () => void;
  setParseProgress: (progress: { phase: 'idle' | 'parsing' | 'diffing'; percent: number }) => void;
  setDiffResult: (result: DiffResult) => void;
  resetToLanding: () => void;
  setActiveSheet: (name: string) => void;
  setSelectedRow: (index: number | null) => void;
  setInspectedCell: (cell: { sheetName: string; diff: CellDiff } | null) => void;
  setAISummary: (summary: { status: 'idle' | 'loading' | 'done' | 'error'; text: string | null }) => void;
  toggleFilter: (key: keyof FilterState) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  addError: (message: string) => void;
  dismissError: (index: number) => void;
}

const defaultFilters: FilterState = {
  showAdded: true,
  showRemoved: true,
  showModified: true,
  showUnchanged: true,
  showFormula: true,
  showValue: true,
  showFormat: true,
};

export const useAppStore = create<AppStore>((set) => ({
  view: 'landing',
  fileA: null,
  fileB: null,
  parseProgress: { phase: 'idle', percent: 0 },
  diffResult: null,
  activeSheet: null,
  selectedRowIndex: null,
  inspectedCell: null,
  aiSummary: { status: 'idle', text: null },
  filters: { ...defaultFilters },
  searchQuery: '',
  sidebarCollapsed: false,
  errors: [],

  setFileA: (file) => set({ fileA: file }),
  setFileB: (file) => set({ fileB: file }),

  swapFiles: () =>
    set((state) => ({ fileA: state.fileB, fileB: state.fileA })),

  startCompare: () =>
    set({ view: 'parsing', parseProgress: { phase: 'parsing', percent: 0 } }),

  setParseProgress: (progress) => set({ parseProgress: progress }),

  setDiffResult: (result) => {
    const firstChanged = result.sheets.find((s) => s.hasChanges);
    set({
      view: 'viewer',
      diffResult: result,
      activeSheet: firstChanged?.name ?? result.sheets[0]?.name ?? null,
      parseProgress: { phase: 'idle', percent: 100 },
      selectedRowIndex: null,
      inspectedCell: null,
      aiSummary: { status: 'idle', text: null },
    });
  },

  resetToLanding: () =>
    set({
      view: 'landing',
      fileA: null,
      fileB: null,
      diffResult: null,
      activeSheet: null,
      selectedRowIndex: null,
      inspectedCell: null,
      aiSummary: { status: 'idle', text: null },
      filters: { ...defaultFilters },
      searchQuery: '',
      parseProgress: { phase: 'idle', percent: 0 },
      errors: [],
    }),

  setActiveSheet: (name) => set({ activeSheet: name, selectedRowIndex: null, inspectedCell: null }),
  setSelectedRow: (index) => set({ selectedRowIndex: index }),
  setInspectedCell: (cell) => set({ inspectedCell: cell }),
  setAISummary: (summary) => set({ aiSummary: summary }),

  toggleFilter: (key) =>
    set((state) => ({
      filters: { ...state.filters, [key]: !state.filters[key] },
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  addError: (message) =>
    set((state) => ({ errors: [...state.errors, message] })),

  dismissError: (index) =>
    set((state) => ({ errors: state.errors.filter((_, i) => i !== index) })),
}));
