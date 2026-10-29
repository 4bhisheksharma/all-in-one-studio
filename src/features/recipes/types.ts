export type RecipeStepType =
  | 'resize'
  | 'format'
  | 'compress'
  | 'corners'
  | 'filter'
  | 'watermark'
  | 'backgroundRemove';

export interface ResizeStepParams {
  mode: 'fit' | 'fill' | 'exact';
  width: number;
  height: number;
}

export interface FormatStepParams {
  format: 'image/webp' | 'image/jpeg' | 'image/png';
  quality: number; // 0.1 to 1.0 (default 0.85)
}

export interface CompressStepParams {
  targetKB: number; // e.g. 150 KB
}

export interface CornersStepParams {
  radius: number; // in pixels
  isCircular?: boolean;
}

export interface FilterStepParams {
  brightness: number; // 0 to 200, default 100
  contrast: number; // 0 to 200, default 100
  saturation: number; // 0 to 200, default 100
  blur: number; // in pixels, default 0
  grayscale: boolean;
  sepia: boolean;
}

export interface WatermarkStepParams {
  text: string;
  position: 'bottom-right' | 'center' | 'top-right' | 'bottom-left';
  opacity: number; // 0.1 to 1.0
  fontSize: number; // default 28
  color: string;
}

export interface BackgroundRemoveStepParams {
  tolerance: number; // default 42
}

export interface RecipeStep {
  id: string;
  type: RecipeStepType;
  name: string;
  enabled: boolean;
  params: any;
}

export interface ImageRecipe {
  id: string;
  name: string;
  description: string;
  category: 'ecommerce' | 'social' | 'web' | 'branding' | 'custom';
  icon: string;
  targetProjectId?: string;
  steps: RecipeStep[];
  isBuiltIn?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BatchItemProgress {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  originalSize: number;
  processedSize?: number;
  resultBlob?: Blob;
  outputWidth?: number;
  outputHeight?: number;
  error?: string;
}
