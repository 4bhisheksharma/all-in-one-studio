import { db } from './db';
import { EditorDraft, ToolType } from '@/types';

export const draftService = {
  async saveDraft<TConfig extends Record<string, unknown>>(
    toolType: ToolType,
    sourceAssetIds: string[],
    config: TConfig,
    projectId: string | null = null,
    canvasWidth?: number,
    canvasHeight?: number
  ): Promise<EditorDraft<TConfig>> {
    const id = `draft-${toolType}`;
    const now = Date.now();
    const existing = await db.drafts.get(id);

    const draft: EditorDraft<TConfig> = {
      id,
      toolType,
      projectId,
      sourceAssetIds,
      config,
      canvasWidth,
      canvasHeight,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    await db.drafts.put(draft as EditorDraft);
    return draft;
  },

  async getDraft<TConfig extends Record<string, unknown>>(toolType: ToolType): Promise<EditorDraft<TConfig> | undefined> {
    const id = `draft-${toolType}`;
    const draft = await db.drafts.get(id);
    return draft as EditorDraft<TConfig> | undefined;
  },

  async listDrafts(): Promise<EditorDraft[]> {
    return await db.drafts.orderBy('updatedAt').reverse().toArray();
  },

  async deleteDraft(id: string): Promise<void> {
    await db.drafts.delete(id);
  },

  async deleteDraftByTool(toolType: ToolType): Promise<void> {
    await db.drafts.delete(`draft-${toolType}`);
  },

  async clearAllDrafts(): Promise<void> {
    await db.drafts.clear();
  },
};
