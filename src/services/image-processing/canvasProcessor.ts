/**
 * Client-side high-fidelity Canvas-based image operations.
 * Preserves high resolution, smooth downsampling, alpha transparency, and accurate dimensions.
 */

import {
  encodeIcoBundle,
  encodeBmp,
  encodeSingleImagePdf,
  checkAvifSupport,
} from './formatEncoders';

export interface ProcessedOutput {
  blob: Blob;
  width: number;
  height: number;
}

export const canvasProcessor = {
  /**
   * Loads a Blob into an HTMLImageElement asynchronously.
   */
  loadImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to decode image data'));
      };
      img.src = url;
    });
  },

  /**
   * Compresses an image with adjustable quality and format.
   */
  async compressImage(
    blob: Blob,
    format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/webp',
    quality = 0.8
  ): Promise<ProcessedOutput> {
    const img = await this.loadImage(blob);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas unavailable');

    // Handle white background fill if saving transparent image as JPEG
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (outBlob) => {
          if (outBlob) {
            resolve({ blob: outBlob, width, height });
          } else {
            reject(new Error('Canvas compression failed'));
          }
        },
        format,
        quality
      );
    });
  },

  /**
   * Resizes an image to specified width and height.
   */
  async resizeImage(
    blob: Blob,
    targetWidth: number,
    targetHeight: number,
    format = 'image/png',
    quality = 0.92
  ): Promise<ProcessedOutput> {
    const img = await this.loadImage(blob);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(targetWidth));
    canvas.height = Math.max(1, Math.round(targetHeight));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas unavailable');

    if (format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (outBlob) => {
          if (outBlob) {
            resolve({ blob: outBlob, width: canvas.width, height: canvas.height });
          } else {
            reject(new Error('Canvas resize failed'));
          }
        },
        format,
        quality
      );
    });
  },

  /**
   * Crops, rotates, and flips an image.
   */
  async cropImage(
    blob: Blob,
    cropRect: { x: number; y: number; width: number; height: number },
    rotationDeg = 0,
    flipH = false,
    flipV = false,
    format = 'image/png',
    quality = 0.95
  ): Promise<ProcessedOutput> {
    const img = await this.loadImage(blob);

    // Create an intermediate canvas for transformations (rotation, flips)
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;

    // Apply rotation & flip on intermediate canvas
    const isSideways = Math.abs(rotationDeg % 180) === 90;
    const transformedW = isSideways ? naturalH : naturalW;
    const transformedH = isSideways ? naturalW : naturalH;

    const tCanvas = document.createElement('canvas');
    tCanvas.width = transformedW;
    tCanvas.height = transformedH;
    const tCtx = tCanvas.getContext('2d');
    if (!tCtx) throw new Error('2D Canvas context unavailable');

    tCtx.translate(transformedW / 2, transformedH / 2);
    tCtx.rotate((rotationDeg * Math.PI) / 180);
    tCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    tCtx.drawImage(img, -naturalW / 2, -naturalH / 2);

    // Now crop from the transformed canvas
    const finalW = Math.max(1, Math.round(cropRect.width));
    const finalH = Math.max(1, Math.round(cropRect.height));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = finalW;
    outCanvas.height = finalH;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) throw new Error('2D Canvas context unavailable');

    if (format === 'image/jpeg') {
      outCtx.fillStyle = '#ffffff';
      outCtx.fillRect(0, 0, finalW, finalH);
    }

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(
      tCanvas,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      finalW,
      finalH
    );

    return new Promise((resolve, reject) => {
      outCanvas.toBlob(
        (outBlob) => {
          if (outBlob) {
            resolve({ blob: outBlob, width: finalW, height: finalH });
          } else {
            reject(new Error('Cropping operation failed'));
          }
        },
        format,
        quality
      );
    });
  },

  /**
   * Format converter between WebP, PNG, JPEG, AVIF, ICO, PDF, and BMP.
   */
  async convertFormat(
    blob: Blob,
    targetMime: string,
    quality = 0.9
  ): Promise<ProcessedOutput> {
    if (targetMime === 'image/x-icon') {
      return encodeIcoBundle(blob);
    }
    if (targetMime === 'image/bmp') {
      return encodeBmp(blob);
    }
    if (targetMime === 'application/pdf') {
      return encodeSingleImagePdf(blob, quality);
    }
    if (targetMime === 'image/avif') {
      const isAvif = await checkAvifSupport();
      if (!isAvif) {
        // Fallback to high-efficiency WebP if browser doesn't support direct canvas AVIF export
        return this.compressImage(blob, 'image/webp', quality);
      }
      return this.compressImage(blob, 'image/avif' as any, quality);
    }
    return this.compressImage(
      blob,
      targetMime as 'image/jpeg' | 'image/png' | 'image/webp',
      quality
    );
  },

  /**
   * Binary search quality to approximate a target file size in KB.
   */
  async approximateTargetSize(
    blob: Blob,
    targetKB: number,
    format: 'image/jpeg' | 'image/webp' = 'image/jpeg'
  ): Promise<ProcessedOutput> {
    const targetBytes = targetKB * 1024;
    let minQuality = 0.1;
    let maxQuality = 0.95;
    let bestResult: ProcessedOutput | null = null;

    // Run up to 5 binary search iterations
    for (let i = 0; i < 5; i++) {
      const mid = (minQuality + maxQuality) / 2;
      const result = await this.compressImage(blob, format, mid);
      bestResult = result;

      if (Math.abs(result.blob.size - targetBytes) < 5000) {
        break; // Within 5KB of target
      }

      if (result.blob.size > targetBytes) {
        maxQuality = mid;
      } else {
        minQuality = mid;
      }
    }

    return bestResult || this.compressImage(blob, format, 0.7);
  },
};
