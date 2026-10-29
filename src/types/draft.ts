import { ToolType } from './processing';

export interface EditorDraft<TConfig = Record<string, unknown>> {
  id: string; // usually `${toolType}-draft` or UUID
  toolType: ToolType;
  projectId: string | null;
  sourceAssetIds: string[];
  config: TConfig;
  canvasWidth?: number;
  canvasHeight?: number;
  createdAt: number;
  updatedAt: number;
}
