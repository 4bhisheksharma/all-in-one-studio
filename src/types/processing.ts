export type ToolType =
  | 'compress'
  | 'resize'
  | 'crop'
  | 'collage'
  | 'bg-remove'
  | 'face-blur'
  | 'convert'
  | 'utilities';

export interface ProcessingJob<TConfig = Record<string, unknown>> {
  id: string;
  toolType: ToolType;
  sourceAssetIds: string[];
  config: TConfig;
  status: 'idle' | 'processing' | 'success' | 'error';
  progress?: number;
  error?: string;
  resultBlob?: Blob;
  resultMimeType?: string;
  resultWidth?: number;
  resultHeight?: number;
  resultSize?: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ProcessingResult {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  sourceAssetId: string;
  variantType: import('./asset').VariantType;
  meta: Record<string, unknown>;
}
