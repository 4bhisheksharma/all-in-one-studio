import { ImageAsset, VariantType } from '@/types';
import {
  BatchQueueConfig,
  QueueItem,
  QueueItemStatus,
} from '@/features/batch-queue/types';
import { assetService } from '@/services/storage/assetService';
import { canvasProcessor } from '@/services/image-processing/canvasProcessor';
import { bgRemovalService } from '@/services/image-processing/bgRemovalService';
import { recipeExecutor } from '@/services/image-processing/recipeExecutor';
import { formatBytes } from '@/utils/cn';

export interface ProcessItemResult {
  status: QueueItemStatus;
  resultBlob?: Blob;
  outputSize?: number;
  outputWidth?: number;
  outputHeight?: number;
  skipReason?: string;
  error?: string;
  savedAsset?: ImageAsset;
}

export const batchQueueService = {
  /**
   * Evaluate if an asset should be skipped according to configured skip rules.
   */
  evaluateSkip(
    asset: ImageAsset,
    config: BatchQueueConfig
  ): { shouldSkip: boolean; reason?: string } {
    const rules = config.skipRules;

    if (rules.skipIfAlreadyProcessed && asset.variantType) {
      return {
        shouldSkip: true,
        reason: `Already a processed derivative (${asset.variantType})`,
      };
    }

    if (
      rules.skipIfSmallerThanKB !== undefined &&
      rules.skipIfSmallerThanKB > 0 &&
      asset.currentSize <= rules.skipIfSmallerThanKB * 1024
    ) {
      return {
        shouldSkip: true,
        reason: `Size (${formatBytes(asset.currentSize)}) is already under ${rules.skipIfSmallerThanKB} KB`,
      };
    }

    if (config.operationType === 'convert' && rules.skipIfAlreadyTargetFormat) {
      if (asset.mimeType === config.convertConfig.targetFormat) {
        return {
          shouldSkip: true,
          reason: `Already ${asset.mimeType.replace('image/', '').toUpperCase()}`,
        };
      }
    }

    if (config.operationType === 'resize' && rules.skipIfDimensionsMet) {
      const { width, height, mode } = config.resizeConfig;
      if (mode === 'max-bounds') {
        if (asset.width <= width && asset.height <= height) {
          return {
            shouldSkip: true,
            reason: `Dimensions (${asset.width}×${asset.height}px) already within ${width}×${height}px`,
          };
        }
      }
    }

    return { shouldSkip: false };
  },

  /**
   * Process a single queue item end-to-end.
   */
  async processItem(
    item: QueueItem,
    config: BatchQueueConfig,
    onProgress: (percent: number, desc?: string) => void
  ): Promise<ProcessItemResult> {
    // 1. Check skip conditions first
    const skipCheck = this.evaluateSkip(item.asset, config);
    if (skipCheck.shouldSkip) {
      return {
        status: 'skipped',
        skipReason: skipCheck.reason,
      };
    }

    onProgress(10, 'Reading image data...');
    const inputBlob = await assetService.getAssetBlob(item.assetId);
    if (!inputBlob) {
      throw new Error(`Failed to load source image data for "${item.asset.filename}"`);
    }

    let outputBlob: Blob;
    let outWidth = item.asset.width;
    let outHeight = item.asset.height;
    let variantType: VariantType = 'other';
    let note = '';
    const meta: Record<string, unknown> = {};

    switch (config.operationType) {
      case 'compress': {
        onProgress(30, 'Compressing image...');
        variantType = 'compressed';
        const compressRes = await canvasProcessor.compressImage(
          inputBlob,
          config.compressConfig.format,
          config.compressConfig.quality
        );
        outputBlob = compressRes.blob;
        outWidth = compressRes.width;
        outHeight = compressRes.height;
        note = `Batch compressed to ${formatBytes(outputBlob.size)} (${Math.round(config.compressConfig.quality * 100)}% quality)`;
        meta.quality = config.compressConfig.quality;
        meta.format = config.compressConfig.format;
        break;
      }

      case 'resize': {
        onProgress(30, 'Resizing image geometry...');
        variantType = 'resized';
        const img = await canvasProcessor.loadImage(inputBlob);
        const { mode, width, height, scalePercent, maintainAspect } = config.resizeConfig;

        let targetW = width;
        let targetH = height;

        if (mode === 'scale') {
          const ratio = (scalePercent || 100) / 100;
          targetW = Math.max(1, Math.round(img.naturalWidth * ratio));
          targetH = Math.max(1, Math.round(img.naturalHeight * ratio));
        } else if (mode === 'max-bounds') {
          const ratio = Math.min(width / img.naturalWidth, height / img.naturalHeight, 1);
          targetW = Math.max(1, Math.round(img.naturalWidth * ratio));
          targetH = Math.max(1, Math.round(img.naturalHeight * ratio));
        } else if (maintainAspect) {
          const aspect = img.naturalWidth / img.naturalHeight;
          targetH = Math.max(1, Math.round(targetW / aspect));
        }

        const resizeRes = await canvasProcessor.resizeImage(inputBlob, targetW, targetH, inputBlob.type);
        outputBlob = resizeRes.blob;
        outWidth = targetW;
        outHeight = targetH;
        note = `Batch resized to ${outWidth}×${outHeight}px`;
        meta.resizeMode = mode;
        break;
      }

      case 'convert': {
        onProgress(30, 'Converting image format...');
        variantType = 'converted';
        const convertRes = await canvasProcessor.convertFormat(
          inputBlob,
          config.convertConfig.targetFormat,
          0.92
        );
        outputBlob = convertRes.blob;
        outWidth = convertRes.width;
        outHeight = convertRes.height;
        note = `Batch converted to ${config.convertConfig.targetFormat.replace('image/', '').toUpperCase()}`;
        meta.targetFormat = config.convertConfig.targetFormat;
        break;
      }

      case 'bg-remove': {
        onProgress(20, 'Analyzing neural foreground...');
        variantType = 'bg-removed';
        outputBlob = await bgRemovalService.removeBackgroundAI(inputBlob, (prog) => {
          onProgress(20 + Math.round(prog.percent * 0.7), prog.stage);
        });
        const img = await canvasProcessor.loadImage(outputBlob);
        outWidth = img.naturalWidth;
        outHeight = img.naturalHeight;
        note = 'Batch neural AI background removal';
        break;
      }

      case 'watermark': {
        onProgress(30, 'Rendering watermark signature...');
        variantType = 'watermarked';
        const img = await canvasProcessor.loadImage(inputBlob);
        outWidth = img.naturalWidth;
        outHeight = img.naturalHeight;

        const canvas = document.createElement('canvas');
        canvas.width = outWidth;
        canvas.height = outHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        ctx.drawImage(img, 0, 0);

        const { text, fontSize, opacity, position, color } = config.watermarkConfig;
        ctx.save();
        ctx.globalAlpha = Math.max(0.1, Math.min(1, opacity));
        ctx.font = `600 ${fontSize}px sans-serif`;
        ctx.fillStyle = color || '#ffffff';
        ctx.textBaseline = 'middle';

        const metrics = ctx.measureText(text);
        const margin = 24;
        let x = margin;
        let y = margin + fontSize / 2;

        if (position === 'center') {
          x = (outWidth - metrics.width) / 2;
          y = outHeight / 2;
        } else if (position === 'bottom-right') {
          x = outWidth - metrics.width - margin;
          y = outHeight - margin - fontSize / 2;
        } else if (position === 'bottom-left') {
          x = margin;
          y = outHeight - margin - fontSize / 2;
        } else if (position === 'top-right') {
          x = outWidth - metrics.width - margin;
          y = margin + fontSize / 2;
        }

        // Drop shadow for legibility
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(text, x, y);
        ctx.restore();

        outputBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Watermark export failed'))), inputBlob.type || 'image/png');
        });
        note = `Batch watermarked with "${text}"`;
        break;
      }

      case 'recipe': {
        if (!config.selectedRecipe) {
          throw new Error('No Smart Recipe selected for execution');
        }
        onProgress(20, `Executing recipe: ${config.selectedRecipe.name}`);
        const result = await recipeExecutor.executeRecipe(inputBlob, config.selectedRecipe, (idx, stepName) => {
          onProgress(20 + idx * 15, `Step: ${stepName}`);
        });
        outputBlob = result.blob;
        outWidth = result.width;
        outHeight = result.height;
        variantType = 'other';
        note = `Batch executed recipe: ${config.selectedRecipe.name}`;
        meta.recipeId = config.selectedRecipe.id;
        break;
      }

      default:
        throw new Error(`Unsupported batch operation "${config.operationType}"`);
    }

    onProgress(90, 'Saving to library...');

    let savedAsset: ImageAsset | undefined;
    if (config.saveToLibrary) {
      savedAsset = await assetService.saveProcessedImage(
        item.asset.id,
        outputBlob,
        variantType,
        meta,
        config.destinationProjectId,
        undefined,
        note,
        `batch-${config.operationType}`
      );
    }

    onProgress(100, 'Completed');

    return {
      status: 'completed',
      resultBlob: outputBlob,
      outputSize: outputBlob.size,
      outputWidth: outWidth,
      outputHeight: outHeight,
      savedAsset,
    };
  },
};
