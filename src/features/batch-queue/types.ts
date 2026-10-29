import { ImageAsset } from '@/types';
import { ImageRecipe } from '@/features/recipes/types';

export type BatchOperationType =
  | 'compress'
  | 'resize'
  | 'convert'
  | 'bg-remove'
  | 'watermark'
  | 'recipe';

export interface BatchCompressConfig {
  format: 'image/jpeg' | 'image/png' | 'image/webp';
  quality: number; // 0.1 to 1.0
  maxTargetKB?: number;
}

export interface BatchResizeConfig {
  mode: 'exact' | 'max-bounds' | 'scale';
  width: number;
  height: number;
  scalePercent: number; // e.g. 50
  maintainAspect: boolean;
}

export interface BatchConvertConfig {
  targetFormat: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface BatchBgRemoveConfig {
  mode: 'ai' | 'chroma';
  quality: 'fast' | 'high';
}

export interface BatchWatermarkConfig {
  text: string;
  fontSize: number;
  opacity: number;
  position: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  color: string;
}

export interface BatchSkipRules {
  skipIfAlreadyTargetFormat?: boolean;
  skipIfSmallerThanKB?: number;
  skipIfDimensionsMet?: boolean;
  skipIfAlreadyProcessed?: boolean;
}

export interface BatchQueueConfig {
  operationType: BatchOperationType;
  compressConfig: BatchCompressConfig;
  resizeConfig: BatchResizeConfig;
  convertConfig: BatchConvertConfig;
  bgRemoveConfig: BatchBgRemoveConfig;
  watermarkConfig: BatchWatermarkConfig;
  recipeId?: string;
  selectedRecipe?: ImageRecipe | null;
  skipRules: BatchSkipRules;
  destinationProjectId: string | null;
  saveToLibrary: boolean;
}

export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'skipped' | 'failed';

export interface QueueItem {
  id: string;
  assetId: string;
  asset: ImageAsset;
  status: QueueItemStatus;
  progress: number;
  stepDescription?: string;
  skipReason?: string;
  error?: string;
  resultBlob?: Blob;
  outputSize?: number;
  outputWidth?: number;
  outputHeight?: number;
  durationMs?: number;
  savedAsset?: ImageAsset;
}
