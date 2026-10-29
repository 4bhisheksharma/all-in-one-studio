export interface CanvasLayer {
  id: string;
  type: 'image' | 'text';
  name: string;
  assetId?: string;
  imgSrc?: string;
  imgElement?: HTMLImageElement;
  
  // Transform
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
  opacity: number; // 0 to 100
  flipX: boolean;
  flipY: boolean;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  aspectRatioLocked?: boolean;

  // Image Tuning & Adjustments
  brightness: number; // 0 - 200, default 100
  contrast: number; // 0 - 200, default 100
  saturation: number; // 0 - 200, default 100
  blur: number; // 0 - 40px
  grayscale: number; // 0 - 100
  sepia: number; // 0 - 100
  invert: number; // 0 - 100
  hueRotate?: number; // 0 - 360 deg

  // Shape & Styling
  borderRadius: number; // 0 - 100px
  borderWidth: number; // 0 - 20px
  borderColor: string;
  shadowBlur: number; // 0 - 50px
  shadowColor: string;

  // Text specific properties
  text?: string;
  fontSize?: number;
  fontColor?: string;
  fontWeight?: string;
  fontFamily?: string;
}

export interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'social' | 'display' | 'custom';
}
