import { create } from 'zustand';
import { ImageAsset, AssetFilter } from '@/types';
import { assetService } from '@/services/storage/assetService';

interface AssetStoreState {
  assets: ImageAsset[];
  selectedIds: string[];
  filter: AssetFilter;
  loading: boolean;
  error: string | null;

  setFilter: (patch: Partial<AssetFilter>) => void;
  resetFilter: () => void;
  fetchAssets: (overrideFilter?: AssetFilter) => Promise<void>;

  toggleSelect: (id: string) => void;
  selectAll: (ids?: string[]) => void;
  clearSelection: () => void;

  toggleFavorite: (id: string) => Promise<void>;
  softDelete: (id: string) => Promise<void>;
  batchSoftDelete: (ids: string[]) => Promise<void>;
  restore: (id: string) => Promise<void>;
  permanentlyDelete: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  duplicate: (id: string) => Promise<ImageAsset | undefined>;
  batchMove: (ids: string[], projectId: string | null, folderId?: string | null) => Promise<void>;
}

export const useAssetStore = create<AssetStoreState>((set, get) => ({
  assets: [],
  selectedIds: [],
  filter: {
    sortBy: 'date-desc',
  },
  loading: false,
  error: null,

  setFilter: (patch) => {
    const next = { ...get().filter, ...patch };
    set({ filter: next });
    get().fetchAssets(next);
  },

  resetFilter: () => {
    const defaultFilter: AssetFilter = { sortBy: 'date-desc' };
    set({ filter: defaultFilter });
    get().fetchAssets(defaultFilter);
  },

  fetchAssets: async (overrideFilter) => {
    const activeFilter = overrideFilter || get().filter;
    set({ loading: true, error: null });
    try {
      const items = await assetService.listAssets(activeFilter);
      set({ assets: items, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load assets',
      });
    }
  },

  toggleSelect: (id) => {
    const current = get().selectedIds;
    if (current.includes(id)) {
      set({ selectedIds: current.filter((item) => item !== id) });
    } else {
      set({ selectedIds: [...current, id] });
    }
  },

  selectAll: (ids) => {
    if (ids) {
      set({ selectedIds: ids });
    } else {
      set({ selectedIds: get().assets.map((a) => a.id) });
    }
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  toggleFavorite: async (id) => {
    await assetService.toggleFavorite(id);
    set((state) => ({
      assets: state.assets.map((a) => (a.id === id ? { ...a, isFavorite: !a.isFavorite } : a)),
    }));
  },

  softDelete: async (id) => {
    await assetService.softDeleteAsset(id);
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
      selectedIds: state.selectedIds.filter((item) => item !== id),
    }));
  },

  batchSoftDelete: async (ids) => {
    for (const id of ids) {
      await assetService.softDeleteAsset(id);
    }
    set((state) => ({
      assets: state.assets.filter((a) => !ids.includes(a.id)),
      selectedIds: [],
    }));
  },

  restore: async (id) => {
    await assetService.restoreAsset(id);
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
      selectedIds: state.selectedIds.filter((item) => item !== id),
    }));
  },

  permanentlyDelete: async (id) => {
    await assetService.permanentlyDeleteAsset(id);
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
      selectedIds: state.selectedIds.filter((item) => item !== id),
    }));
  },

  emptyTrash: async () => {
    const trashed = await assetService.listAssets({ isTrash: true });
    for (const a of trashed) {
      await assetService.permanentlyDeleteAsset(a.id);
    }
    set({ assets: [], selectedIds: [] });
  },

  duplicate: async (id) => {
    const duplicated = await assetService.duplicateAsset(id);
    if (duplicated) {
      await get().fetchAssets();
    }
    return duplicated;
  },

  batchMove: async (ids, projectId, folderId = null) => {
    for (const id of ids) {
      await assetService.updateAsset(id, { projectId, folderId });
    }
    await get().fetchAssets();
    set({ selectedIds: [] });
  },
}));
