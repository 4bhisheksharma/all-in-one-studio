import { useState, useEffect, useRef, useCallback } from 'react';
import { ToolType, EditorDraft } from '@/types';
import { draftService } from '@/services/storage/draftService';
import { toast } from 'sonner';

interface UseToolDraftOptions<TConfig extends Record<string, unknown>> {
  toolType: ToolType;
  config: TConfig;
  sourceAssetIds: string[];
  projectId?: string | null;
  canvasWidth?: number;
  canvasHeight?: number;
  enabled?: boolean;
  onRestore?: (draft: EditorDraft<TConfig>) => void;
}

export function useToolDraft<TConfig extends Record<string, unknown>>({
  toolType,
  config,
  sourceAssetIds,
  projectId = null,
  canvasWidth,
  canvasHeight,
  enabled = true,
  onRestore,
}: UseToolDraftOptions<TConfig>) {
  const [existingDraft, setExistingDraft] = useState<EditorDraft<TConfig> | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const initialCheckDone = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for existing draft on initial mount
  useEffect(() => {
    let active = true;
    if (!initialCheckDone.current && enabled) {
      initialCheckDone.current = true;
      draftService.getDraft<TConfig>(toolType).then((draft) => {
        if (active && draft && draft.sourceAssetIds.length > 0) {
          setExistingDraft(draft);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [toolType, enabled]);

  // Debounced autosave on config or asset changes
  const saveCurrentDraft = useCallback(async () => {
    if (!enabled || sourceAssetIds.length === 0) return;
    try {
      const saved = await draftService.saveDraft(
        toolType,
        sourceAssetIds,
        config,
        projectId,
        canvasWidth,
        canvasHeight
      );
      setIsSaved(true);
      setLastSaved(saved.updatedAt);
    } catch (e) {
      console.warn('Draft autosave failed:', e);
    }
  }, [toolType, sourceAssetIds, config, projectId, canvasWidth, canvasHeight, enabled]);

  useEffect(() => {
    if (!enabled || sourceAssetIds.length === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSaved(false);
    debounceTimerRef.current = setTimeout(() => {
      saveCurrentDraft();
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [config, sourceAssetIds, enabled, saveCurrentDraft]);

  const resumeDraft = () => {
    if (existingDraft && onRestore) {
      onRestore(existingDraft);
      toast.success('Restored previous draft session');
      setExistingDraft(null);
    }
  };

  const discardDraft = async () => {
    await draftService.deleteDraftByTool(toolType);
    setExistingDraft(null);
    toast.info('Draft discarded');
  };

  return {
    existingDraft,
    isSaved,
    lastSaved,
    resumeDraft,
    discardDraft,
  };
}
