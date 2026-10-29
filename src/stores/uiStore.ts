import { create } from 'zustand';
import { ViewMode } from '@/types';

interface UIState {
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  viewMode: ViewMode;
  storageUsed: number;
  storageQuota: number;
  activeUploadModal: boolean;
  activeCreateProjectModal: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setStorageStats: (used: number, quota: number) => void;
  setActiveUploadModal: (open: boolean) => void;
  setActiveCreateProjectModal: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileDrawerOpen: false,
  viewMode: 'grid',
  storageUsed: 0,
  storageQuota: 0,
  activeUploadModal: false,
  activeCreateProjectModal: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setStorageStats: (used, quota) => set({ storageUsed: used, storageQuota: quota }),
  setActiveUploadModal: (open) => set({ activeUploadModal: open }),
  setActiveCreateProjectModal: (open) => set({ activeCreateProjectModal: open }),
}));
