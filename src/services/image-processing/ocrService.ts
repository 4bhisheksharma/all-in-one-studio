/**
 * Client-Side OCR Text Extractor & Document Enhancement Engine
 * Uses Tesseract.js WebAssembly worker and custom Canvas binarization algorithms
 * to clean up documents and extract text without any server calls.
 */

import { createWorker, Worker } from 'tesseract.js';

export type DocumentFilterType = 'none' | 'binarize' | 'high-contrast' | 'sharpen';

export interface OcrWordBox {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OcrResult {
  text: string;
  confidence: number;
  wordCount: number;
  lineCount: number;
  words: OcrWordBox[];
  processedImageBlob: Blob;
}

let ocrWorkerInstance: Worker | null = null;

export const ocrService = {
  /**
   * Apply document preprocessing filters to optimize OCR readability and clean up phone photos.
   */
  async preprocessDocument(
    imageSource: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
    filter: DocumentFilterType
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = imageSource.width;
    canvas.height = imageSource.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get 2D context');

    ctx.drawImage(imageSource, 0, 0);
    if (filter === 'none') {
      return canvas;
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const len = data.length;

    if (filter === 'high-contrast') {
      // Grayscale + Histogram stretch & contrast boost
      for (let i = 0; i < len; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Contrast curve: clamp and stretch
        const contrasted = Math.min(255, Math.max(0, (gray - 128) * 1.6 + 128));
        data[i] = contrasted;
        data[i + 1] = contrasted;
        data[i + 2] = contrasted;
      }
    } else if (filter === 'binarize') {
      // Otsu adaptive document thresholding
      // 1. Calculate histogram
      const histogram = new Array(256).fill(0);
      const grays = new Uint8Array(len / 4);

      for (let i = 0, j = 0; i < len; i += 4, j++) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        grays[j] = gray;
        histogram[gray]++;
      }

      const totalPixels = grays.length;
      let sum = 0;
      for (let t = 0; t < 256; t++) sum += t * histogram[t];

      let sumB = 0;
      let wB = 0;
      let wF = 0;
      let maxVariance = 0;
      let threshold = 128;

      for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        wF = totalPixels - wB;
        if (wF === 0) break;

        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) * (mB - mF);

        if (variance > maxVariance) {
          maxVariance = variance;
          threshold = t;
        }
      }

      // Slightly bias towards retaining text stroke thickness
      threshold = Math.min(200, Math.max(80, threshold + 10));

      for (let i = 0, j = 0; i < len; i += 4, j++) {
        const val = grays[j] < threshold ? 0 : 255;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
    } else if (filter === 'sharpen') {
      // 3x3 unsharp laplacian kernel
      const copy = new Uint8ClampedArray(data);
      const w = canvas.width;
      const h = canvas.height;

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const val =
              5 * copy[idx + c] -
              copy[((y - 1) * w + x) * 4 + c] -
              copy[((y + 1) * w + x) * 4 + c] -
              copy[(y * w + (x - 1)) * 4 + c] -
              copy[(y * w + (x + 1)) * 4 + c];
            data[idx + c] = Math.min(255, Math.max(0, val));
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  },

  /**
   * Run OCR extraction using client-side Tesseract.js.
   */
  async recognizeText(
    canvas: HTMLCanvasElement,
    lang = 'eng',
    onProgress?: (progress: number, status: string) => void
  ): Promise<OcrResult> {
    if (!ocrWorkerInstance) {
      if (onProgress) onProgress(10, 'Initializing OCR engine...');
      ocrWorkerInstance = await createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(20 + m.progress * 80), 'Recognizing text...');
          }
        },
      });
    }

    if (onProgress) onProgress(20, 'Analyzing document characters...');
    const ret = await ocrWorkerInstance.recognize(canvas);

    const words: OcrWordBox[] = [];
    const dataAny = ret.data as unknown as { words?: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }> };
    if (dataAny && Array.isArray(dataAny.words)) {
      for (const w of dataAny.words) {
        words.push({
          text: w.text,
          confidence: w.confidence,
          bbox: {
            x0: w.bbox.x0,
            y0: w.bbox.y0,
            x1: w.bbox.x1,
            y1: w.bbox.y1,
          },
        });
      }
    }

    // Convert canvas to blob
    const processedBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
    });

    const lines = ret.data.text.split('\n').filter((l) => l.trim().length > 0);

    return {
      text: ret.data.text.trim(),
      confidence: Math.round(ret.data.confidence),
      wordCount: words.length,
      lineCount: lines.length,
      words,
      processedImageBlob: processedBlob,
    };
  },

  /**
   * Terminate worker to free memory when leaving or reloading.
   */
  async terminate() {
    if (ocrWorkerInstance) {
      await ocrWorkerInstance.terminate();
      ocrWorkerInstance = null;
    }
  },
};
