/**
 * Animated GIF Maker & Frame Decomposer Engine
 * High-performance client-side GIF creation using `gifenc`
 * and frame decomposition using `omggif`.
 */

import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { GifReader } from 'omggif';
import { zipSync } from 'fflate';

export interface GifFrameItem {
  id: string;
  source: HTMLImageElement | ImageBitmap | HTMLCanvasElement;
  name: string;
  previewUrl: string;
  delayMs?: number; // per-frame delay override
}

export interface GifCreateOptions {
  fps: number; // 1 to 30 fps (e.g. 10 fps -> 100ms)
  loop: number; // 0 = infinite, 1 = once
  maxDimension: number; // e.g. 480, 640, 800, 0 = original
  qualityColors: number; // 64, 128, 256
}

export interface ExtractedGifFrame {
  index: number;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  delayMs: number;
  filename: string;
}

export const gifStudioService = {
  /**
   * Create an animated GIF from a sequence of image frames.
   */
  async createAnimatedGif(
    frames: GifFrameItem[],
    options: GifCreateOptions,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    if (frames.length === 0) throw new Error('No frames provided');

    // Base dimensions from the first frame
    let targetWidth = frames[0].source.width;
    let targetHeight = frames[0].source.height;

    if (options.maxDimension > 0) {
      const maxDim = options.maxDimension;
      if (targetWidth > maxDim || targetHeight > maxDim) {
        if (targetWidth >= targetHeight) {
          targetHeight = Math.round((targetHeight / targetWidth) * maxDim);
          targetWidth = maxDim;
        } else {
          targetWidth = Math.round((targetWidth / targetHeight) * maxDim);
          targetHeight = maxDim;
        }
      }
    }

    // Ensure even dimensions for video/gif codecs
    targetWidth = Math.max(2, targetWidth - (targetWidth % 2));
    targetHeight = Math.max(2, targetHeight - (targetHeight % 2));

    const encoder = GIFEncoder();
    const scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = targetWidth;
    scratchCanvas.height = targetHeight;
    const scratchCtx = scratchCanvas.getContext('2d', { willReadFrequently: true });
    if (!scratchCtx) throw new Error('Failed to get scratch canvas context');

    const defaultDelay = Math.round(1000 / options.fps);

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      scratchCtx.clearRect(0, 0, targetWidth, targetHeight);
      scratchCtx.drawImage(frame.source, 0, 0, targetWidth, targetHeight);

      const imgData = scratchCtx.getImageData(0, 0, targetWidth, targetHeight);
      const rgba = imgData.data;

      // Quantize colors using gifenc
      const palette = quantize(rgba, options.qualityColors || 256);
      const index = applyPalette(rgba, palette);

      const frameDelay = frame.delayMs !== undefined ? frame.delayMs : defaultDelay;

      encoder.writeFrame(index, targetWidth, targetHeight, {
        palette,
        delay: frameDelay,
        repeat: options.loop,
      });

      if (onProgress) {
        onProgress(Math.round(((i + 1) / frames.length) * 100));
      }
    }

    encoder.finish();
    const bytes = encoder.bytes();
    return new Blob([bytes as unknown as BlobPart], { type: 'image/gif' });
  },

  /**
   * Decompose an animated GIF into individual PNG frames.
   */
  async extractFramesFromGif(gifBlob: Blob): Promise<ExtractedGifFrame[]> {
    const arrayBuffer = await gifBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const reader = new GifReader(uint8Array);
    const numFrames = reader.numFrames();
    const width = reader.width;
    const height = reader.height;

    const frames: ExtractedGifFrame[] = [];

    // Composition canvas for disposal handling
    const compCanvas = document.createElement('canvas');
    compCanvas.width = width;
    compCanvas.height = height;
    const compCtx = compCanvas.getContext('2d', { willReadFrequently: true });
    if (!compCtx) throw new Error('Could not get 2D context');

    // Scratch canvas for current frame pixels
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = width;
    frameCanvas.height = height;
    const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
    if (!frameCtx) throw new Error('Could not get frame context');

    for (let i = 0; i < numFrames; i++) {
      const frameInfo = reader.frameInfo(i);
      const framePixels = new Uint8ClampedArray(width * height * 4);
      reader.decodeAndBlitFrameRGBA(i, framePixels);

      const imgData = new ImageData(framePixels, width, height);
      frameCtx.putImageData(imgData, 0, 0);

      // Composite onto master canvas
      compCtx.drawImage(frameCanvas, 0, 0);

      const framePngBlob = await new Promise<Blob>((resolve) => {
        compCanvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
      });

      const dataUrl = compCanvas.toDataURL('image/png');
      const delayMs = frameInfo.delay ? frameInfo.delay * 10 : 100;

      frames.push({
        index: i + 1,
        blob: framePngBlob,
        dataUrl,
        width,
        height,
        delayMs,
        filename: `frame-${String(i + 1).padStart(3, '0')}.png`,
      });

      // Handle disposal method if restore to background
      if (frameInfo.disposal === 2) {
        compCtx.clearRect(frameInfo.x, frameInfo.y, frameInfo.width, frameInfo.height);
      }
    }

    return frames;
  },

  /**
   * Bundle extracted frames into a ZIP file.
   */
  async bundleFramesZip(frames: ExtractedGifFrame[]): Promise<Blob> {
    const zipData: Record<string, Uint8Array> = {};

    for (const frame of frames) {
      const buf = await frame.blob.arrayBuffer();
      zipData[frame.filename] = new Uint8Array(buf);
    }

    const zipped = zipSync(zipData);
    return new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });
  },
};
