import { ImageRecipe, RecipeStep } from '@/features/recipes/types';
import { canvasProcessor } from './canvasProcessor';

export interface RecipeExecutionResult {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
}

export const recipeExecutor = {
  /**
   * Executes a sequential recipe pipeline on a single image Blob.
   */
  async executeRecipe(
    inputBlob: Blob,
    recipe: ImageRecipe,
    onStepProgress?: (stepIndex: number, stepName: string) => void
  ): Promise<RecipeExecutionResult> {
    let currentBlob = inputBlob;
    let currentImg = await canvasProcessor.loadImage(currentBlob);
    let currentWidth = currentImg.naturalWidth;
    let currentHeight = currentImg.naturalHeight;
    let currentMimeType = inputBlob.type || 'image/png';

    const enabledSteps = recipe.steps.filter((s) => s.enabled);

    for (let i = 0; i < enabledSteps.length; i++) {
      const step = enabledSteps[i];
      if (onStepProgress) {
        onStepProgress(i, step.name);
      }

      const res = await this.executeStep(currentBlob, currentImg, currentWidth, currentHeight, currentMimeType, step);
      currentBlob = res.blob;
      currentWidth = res.width;
      currentHeight = res.height;
      currentMimeType = res.mimeType;

      // Reload image element for next step if there are subsequent steps
      if (i < enabledSteps.length - 1) {
        currentImg = await canvasProcessor.loadImage(currentBlob);
      }
    }

    return {
      blob: currentBlob,
      width: currentWidth,
      height: currentHeight,
      mimeType: currentMimeType,
    };
  },

  /**
   * Execute an individual step on the intermediate image.
   */
  async executeStep(
    blob: Blob,
    img: HTMLImageElement,
    w: number,
    h: number,
    mimeType: string,
    step: RecipeStep
  ): Promise<RecipeExecutionResult> {
    switch (step.type) {
      case 'resize': {
        const { mode, width: targetW, height: targetH } = step.params;
        let outW = targetW;
        let outH = targetH;

        if (mode === 'fit') {
          const scale = Math.min(targetW / w, targetH / h);
          outW = Math.round(w * scale);
          outH = Math.round(h * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, outW);
        canvas.height = Math.max(1, outH);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (mode === 'fill') {
          // Scale & center crop
          const scale = Math.max(targetW / w, targetH / h);
          const scaledW = w * scale;
          const scaledH = h * scale;
          const ox = (targetW - scaledW) / 2;
          const oy = (targetH - scaledH) / 2;
          ctx.drawImage(img, ox, oy, scaledW, scaledH);
        } else {
          ctx.drawImage(img, 0, 0, outW, outH);
        }

        const outBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Resize failed'))), mimeType);
        });

        return { blob: outBlob, width: canvas.width, height: canvas.height, mimeType };
      }

      case 'corners': {
        const { radius, isCircular } = step.params;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.beginPath();
        if (isCircular) {
          const r = Math.min(w, h) / 2;
          ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        } else {
          const r = Math.min(radius, w / 2, h / 2);
          ctx.roundRect(0, 0, w, h, r);
        }
        ctx.clip();
        ctx.drawImage(img, 0, 0, w, h);

        // Output must be PNG or WebP to support transparency
        const outMime = mimeType === 'image/jpeg' ? 'image/png' : mimeType;
        const outBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Corner clipping failed'))), outMime);
        });

        return { blob: outBlob, width: w, height: h, mimeType: outMime };
      }

      case 'filter': {
        const { brightness, contrast, saturation, blur, grayscale, sepia } = step.params;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable');

        const filters: string[] = [];
        if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
        if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
        if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
        if (blur > 0) filters.push(`blur(${blur}px)`);
        if (grayscale) filters.push('grayscale(100%)');
        if (sepia) filters.push('sepia(100%)');

        if (filters.length > 0) ctx.filter = filters.join(' ');
        ctx.drawImage(img, 0, 0, w, h);

        const outBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Filter application failed'))), mimeType);
        });

        return { blob: outBlob, width: w, height: h, mimeType };
      }

      case 'watermark': {
        const { text, position, opacity, fontSize, color } = step.params;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable');

        ctx.drawImage(img, 0, 0, w, h);

        ctx.save();
        ctx.globalAlpha = Math.max(0.1, Math.min(1, opacity || 0.4));
        ctx.fillStyle = color || '#ffffff';
        ctx.font = `bold ${fontSize || Math.round(w * 0.03)}px sans-serif`;

        const padding = 24;
        const textMetrics = ctx.measureText(text);

        let tx = padding;
        let ty = h - padding;

        if (position === 'bottom-right') {
          tx = w - textMetrics.width - padding;
          ty = h - padding;
        } else if (position === 'center') {
          tx = (w - textMetrics.width) / 2;
          ty = h / 2;
        } else if (position === 'top-right') {
          tx = w - textMetrics.width - padding;
          ty = padding + (fontSize || 28);
        } else if (position === 'bottom-left') {
          tx = padding;
          ty = h - padding;
        }

        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillText(text, tx, ty);
        ctx.restore();

        const outBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Watermark application failed'))), mimeType);
        });

        return { blob: outBlob, width: w, height: h, mimeType };
      }

      case 'backgroundRemove': {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable');

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const cornerR = (data[0] + data[(w - 1) * 4] + data[(h - 1) * w * 4]) / 3;
        const cornerG = (data[1] + data[(w - 1) * 4 + 1] + data[(h - 1) * w * 4 + 1]) / 3;
        const cornerB = (data[2] + data[(w - 1) * 4 + 2] + data[(h - 1) * w * 4 + 2]) / 3;

        const tol = step.params.tolerance || 42;
        const total = w * h;
        for (let i = 0; i < total; i++) {
          const idx = i * 4;
          const dist = Math.sqrt(
            (data[idx] - cornerR) ** 2 +
            (data[idx + 1] - cornerG) ** 2 +
            (data[idx + 2] - cornerB) ** 2
          );
          if (dist < tol) {
            data[idx + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);

        const outMime = 'image/png';
        const outBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('BG removal failed'))), outMime);
        });

        return { blob: outBlob, width: w, height: h, mimeType: outMime };
      }

      case 'format': {
        const { format: targetFormat, quality } = step.params;
        const out = await canvasProcessor.compressImage(blob, targetFormat, quality || 0.85);
        return { blob: out.blob, width: out.width, height: out.height, mimeType: targetFormat };
      }

      case 'compress': {
        const { targetKB } = step.params;
        const targetFormat = (mimeType === 'image/jpeg' ? 'image/jpeg' : 'image/webp') as 'image/jpeg' | 'image/webp';
        const out = await canvasProcessor.approximateTargetSize(blob, targetKB, targetFormat);
        return { blob: out.blob, width: out.width, height: out.height, mimeType: targetFormat };
      }

      default:
        return { blob, width: w, height: h, mimeType };
    }
  },
};
