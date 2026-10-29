import { create } from 'zustand';
import { EditorDraft, ToolType } from '@/types';
import { draftService } from '@/services/storage/draftService';

interface DraftStoreState {
  drafts: EditorDraft[];
  loading: boolean;
  error: string | null;

  fetchDrafts: () => Promise<void>;
  saveDraft: <TConfig extends Record<string, unknown>>(
    toolType: ToolType,
    sourceAssetIds: string[],
    config: TConfig,
    projectId?: string | null,
    canvasWidth?: number,
    canvasHeight?: number
  ) => Promise<EditorDraft<TConfig>>;
  deleteDraft: (id: string) => Promise<void>;
  clearAllDrafts: () => Promise<void>;
}

export const useDraftStore = create<DraftStoreState>((set, get) => ({
  drafts: [],
  loading: false,
  error: null,

  fetchDrafts: async () => {
    set({ loading: true, error: null });
    try {
      const items = await draftService.listDrafts();
      set({ drafts: items, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load drafts',
      });
    }
  },

  saveDraft: async (toolType, sourceAssetIds, config, projectId, canvasWidth, canvasHeight) => {
    const draft = await draftService.saveDraft(
      toolType,
      sourceAssetIds,
      config,
      projectId,
      canvasWidth,
      canvasHeight
    );
    await get().fetchDrafts();
    return draft;
  },

  deleteDraft: async (id) => {
    await draftService.deleteDraft(id);
    await get().fetchDrafts();
  },

  clearAllDrafts: async () => {
    await draftService.clearAllDrafts();
    set({ drafts: [] });
  },
}));
