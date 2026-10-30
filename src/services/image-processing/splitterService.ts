/**
 * Image Slicer & Splitter Service
 * Provides client-side slicing for social carousels (Instagram/LinkedIn) and grid tiles.
 */

import { zipSync } from 'fflate';

export interface SliceResult {
  id: string;
  index: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  blob: Blob;
  dataUrl: string;
  label: string;
  filename: string;
}

export type SplitMode = 'carousel' | 'grid';

export interface SplitOptions {
  mode: SplitMode;
  // Carousel mode options
  slides?: number; // 2 to 10
  carouselAspect?: 'original' | '4:5' | '1:1';
  // Grid mode options
  rows?: number; // 1 to 10
  cols?: number; // 1 to 10
  numbering?: 'standard' | 'instagram-feed'; // instagram reverse order for posting
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number; // 0.1 to 1.0
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for splitting'));
    };
    img.src = url;
  });
}

export const splitterService = {
  /**
   * Calculates slice coordinates without generating blobs (for fast real-time UI overlay).
   */
  calculateSliceBounds(
    imageWidth: number,
    imageHeight: number,
    options: SplitOptions
  ): { x: number; y: number; width: number; height: number; label: string; index: number }[] {
    const slices: { x: number; y: number; width: number; height: number; label: string; index: number }[] = [];

    if (options.mode === 'carousel') {
      const numSlides = Math.max(2, Math.min(10, options.slides || 3));
      const sliceWidth = Math.floor(imageWidth / numSlides);

      for (let i = 0; i < numSlides; i++) {
        const x = i * sliceWidth;
        const w = i === numSlides - 1 ? imageWidth - x : sliceWidth;
        slices.push({
          x,
          y: 0,
          width: w,
          height: imageHeight,
          label: `Slide ${i + 1}`,
          index: i + 1,
        });
      }
    } else {
      // Grid mode
      const rows = Math.max(1, Math.min(10, options.rows || 3));
      const cols = Math.max(1, Math.min(10, options.cols || 3));
      const cellW = Math.floor(imageWidth / cols);
      const cellH = Math.floor(imageHeight / rows);
      const total = rows * cols;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cellW;
          const y = r * cellH;
          const w = c === cols - 1 ? imageWidth - x : cellW;
          const h = r === rows - 1 ? imageHeight - y : cellH;

          const standardIdx = r * cols + c + 1;
          const igIdx = total - (r * cols + c);
          const index = options.numbering === 'instagram-feed' ? igIdx : standardIdx;

          slices.push({
            x,
            y,
            width: w,
            height: h,
            label: `Tile ${index}`,
            index,
          });
        }
      }
    }

    return slices;
  },

  /**
   * Slices an image into individual Blob pieces and returns full metadata.
   */
  async splitImage(
    blob: Blob,
    baseFilename: string,
    options: SplitOptions
  ): Promise<SliceResult[]> {
    const img = await loadImage(blob);
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;

    const bounds = this.calculateSliceBounds(naturalW, naturalH, options);
    const results: SliceResult[] = [];
    const format = options.format || 'image/png';
    const quality = options.quality ?? 0.92;
    const ext = format === 'image/jpeg' ? '.jpg' : format === 'image/webp' ? '.webp' : '.png';

    const cleanBaseName = baseFilename.replace(/\.[^/.]+$/, '');

    for (let i = 0; i < bounds.length; i++) {
      const bound = bounds[i];
      const canvas = document.createElement('canvas');
      canvas.width = bound.width;
      canvas.height = bound.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D Canvas unavailable');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // If JPEG, fill white background to preserve alpha
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, bound.width, bound.height);
      }

      ctx.drawImage(
        img,
        bound.x,
        bound.y,
        bound.width,
        bound.height,
        0,
        0,
        bound.width,
        bound.height
      );

      const sliceBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, format, quality)
      );

      if (!sliceBlob) throw new Error(`Failed to render slice ${bound.label}`);

      const dataUrl = canvas.toDataURL(format, quality);
      const paddedIndex = String(bound.index).padStart(2, '0');
      const filename = `${cleanBaseName}_${bound.label.toLowerCase().replace(/\s+/g, '_')}_${paddedIndex}${ext}`;

      results.push({
        id: crypto.randomUUID(),
        index: bound.index,
        row: Math.floor(i / (options.cols || 1)),
        col: i % (options.cols || 1),
        x: bound.x,
        y: bound.y,
        width: bound.width,
        height: bound.height,
        blob: sliceBlob,
        dataUrl,
        label: bound.label,
        filename,
      });
    }

    return results;
  },

  /**
   * Bundles all slices into a single ZIP file for 1-click batch download.
   */
  async createSlicesZip(slices: SliceResult[]): Promise<Blob> {
    const zipData: Record<string, Uint8Array> = {};

    for (const slice of slices) {
      const buf = await slice.blob.arrayBuffer();
      zipData[slice.filename] = new Uint8Array(buf);
    }

    const zipped = zipSync(zipData);
    return new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });
  },
};
