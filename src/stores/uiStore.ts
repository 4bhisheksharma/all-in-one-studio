import { create } from 'zustand';
import { ViewMode } from '@/types';

export type AppTheme = 'dark' | 'light' | 'system';

interface UIState {
  theme: AppTheme;
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  viewMode: ViewMode;
  storageUsed: number;
  storageQuota: number;
  activeUploadModal: boolean;
  activeCreateProjectModal: boolean;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setStorageStats: (used: number, quota: number) => void;
  updateStorageUsage: () => Promise<void>;
  setActiveUploadModal: (open: boolean) => void;
  setActiveCreateProjectModal: (open: boolean) => void;
}

const applyThemeToDOM = (theme: AppTheme) => {
  if (typeof window === 'undefined') return;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

const getStoredTheme = (): AppTheme => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('imago_theme') as AppTheme | null;
  if (saved && (saved === 'dark' || saved === 'light' || saved === 'system')) {
    return saved;
  }
  return 'dark';
};

export const useUIStore = create<UIState>((set, get) => ({
  theme: getStoredTheme(),
  sidebarCollapsed: false,
  mobileDrawerOpen: false,
  viewMode: 'grid',
  storageUsed: 0,
  storageQuota: 0,
  activeUploadModal: false,
  activeCreateProjectModal: false,

  setTheme: (theme: AppTheme) => {
    localStorage.setItem('imago_theme', theme);
    applyThemeToDOM(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next: AppTheme = current === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  initTheme: () => {
    const theme = getStoredTheme();
    applyThemeToDOM(theme);
    set({ theme });

    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (get().theme === 'system') {
          applyThemeToDOM('system');
        }
      });
    }
  },

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setStorageStats: (used, quota) => set({ storageUsed: used, storageQuota: quota }),
  updateStorageUsage: async () => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        set({
          storageUsed: est.usage || 0,
          storageQuota: est.quota || 0,
        });
      } catch (err) {
        console.warn('Storage estimate failed:', err);
      }
    }
  },
  setActiveUploadModal: (open) => set({ activeUploadModal: open }),
  setActiveCreateProjectModal: (open) => set({ activeCreateProjectModal: open }),
}));
