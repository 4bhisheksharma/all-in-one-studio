import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  FolderInput,
  Sliders,
  Filter,
  Minimize2,
  Maximize2,
  RefreshCw,
  Stamp,
  Wand2,
  Pause,
} from 'lucide-react';
import { ImageAsset } from '@/types';
import { useProjectStore } from '@/stores/projectStore';
import { useAssetStore } from '@/stores/assetStore';
import { recipeService } from '@/services/storage/recipeService';
import { ImageRecipe } from '@/features/recipes/types';
import {
  BatchQueueConfig,
  QueueItem,
  BatchOperationType,
} from './types';
import { batchQueueService } from '@/services/batch/batchQueueService';
import { downloadService } from '@/services/export/downloadService';
import { formatBytes } from '@/utils/cn';
import { toast } from 'sonner';

interface BatchQueueModalProps {
  initialAssets: ImageAsset[];
  isOpen: boolean;
  onClose: () => void;
}

export const BatchQueueModal: React.FC<BatchQueueModalProps> = ({
  initialAssets,
  isOpen,
  onClose,
}) => {
  const { projects } = useProjectStore();
  const { fetchAssets } = useAssetStore();

  const [recipes, setRecipes] = useState<ImageRecipe[]>([]);
  const [stage, setStage] = useState<'configure' | 'processing' | 'done'>('configure');

  // Config State
  const [config, setConfig] = useState<BatchQueueConfig>({
    operationType: 'compress',
    compressConfig: {
      format: 'image/webp',
      quality: 0.8,
      maxTargetKB: 300,
    },
    resizeConfig: {
      mode: 'max-bounds',
      width: 1920,
      height: 1080,
      scalePercent: 50,
      maintainAspect: true,
    },
    convertConfig: {
      targetFormat: 'image/webp',
    },
    bgRemoveConfig: {
      mode: 'ai',
      quality: 'high',
    },
    watermarkConfig: {
      text: 'CONFIDENTIAL',
      fontSize: 32,
      opacity: 0.35,
      position: 'bottom-right',
      color: '#ffffff',
    },
    recipeId: '',
    selectedRecipe: null,
    skipRules: {
      skipIfAlreadyTargetFormat: true,
      skipIfSmallerThanKB: 150,
      skipIfDimensionsMet: true,
      skipIfAlreadyProcessed: false,
    },
    destinationProjectId: null,
    saveToLibrary: true,
  });

  // Queue state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const abortControllerRef = useRef<boolean>(false);

  useEffect(() => {
    recipeService.getRecipes().then(setRecipes);
  }, []);

  useEffect(() => {
    if (initialAssets.length > 0) {
      setQueue(
        initialAssets.map((asset) => ({
          id: crypto.randomUUID(),
          assetId: asset.id,
          asset,
          status: 'pending',
          progress: 0,
        }))
      );
    }
  }, [initialAssets]);

  if (!isOpen) return null;

  const handleStartQueue = async () => {
    setStage('processing');
    setIsRunning(true);
    abortControllerRef.current = false;

    // Reset items to pending
    setQueue((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'pending',
        progress: 0,
        error: undefined,
        skipReason: undefined,
      }))
    );

    const itemsToProcess = [...queue];

    for (let i = 0; i < itemsToProcess.length; i++) {
      if (abortControllerRef.current) break;

      const currentItem = itemsToProcess[i];

      // Set to processing
      setQueue((prev) =>
        prev.map((item) =>
          item.id === currentItem.id
            ? { ...item, status: 'processing', progress: 5, stepDescription: 'Starting...' }
            : item
        )
      );

      const startTime = performance.now();

      try {
        const result = await batchQueueService.processItem(
          currentItem,
          config,
          (percent, desc) => {
            setQueue((prev) =>
              prev.map((item) =>
                item.id === currentItem.id
                  ? { ...item, progress: percent, stepDescription: desc }
                  : item
              )
            );
          }
        );

        const durationMs = Math.round(performance.now() - startTime);

        setQueue((prev) =>
          prev.map((item) =>
            item.id === currentItem.id
              ? {
                  ...item,
                  status: result.status,
                  progress: 100,
                  skipReason: result.skipReason,
                  resultBlob: result.resultBlob,
                  outputSize: result.outputSize,
                  outputWidth: result.outputWidth,
                  outputHeight: result.outputHeight,
                  durationMs,
                  savedAsset: result.savedAsset,
                }
              : item
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown processing error';
        setQueue((prev) =>
          prev.map((item) =>
            item.id === currentItem.id
              ? { ...item, status: 'failed', error: message, progress: 0 }
              : item
          )
        );
      }
    }

    setIsRunning(false);
    setStage('done');
    await fetchAssets();
    toast.success('Batch processing queue finished!');
  };

  const handleRetryFailed = async () => {
    setIsRunning(true);
    abortControllerRef.current = false;

    const failedItems = queue.filter((q) => q.status === 'failed');

    for (const failedItem of failedItems) {
      if (abortControllerRef.current) break;

      setQueue((prev) =>
        prev.map((item) =>
          item.id === failedItem.id
            ? { ...item, status: 'processing', progress: 5, error: undefined }
            : item
        )
      );

      try {
        const result = await batchQueueService.processItem(
          failedItem,
          config,
          (percent, desc) => {
            setQueue((prev) =>
              prev.map((item) =>
                item.id === failedItem.id
                  ? { ...item, progress: percent, stepDescription: desc }
                  : item
              )
            );
          }
        );

        setQueue((prev) =>
          prev.map((item) =>
            item.id === failedItem.id
              ? {
                  ...item,
                  status: result.status,
                  progress: 100,
                  skipReason: result.skipReason,
                  resultBlob: result.resultBlob,
                  outputSize: result.outputSize,
                  savedAsset: result.savedAsset,
                }
              : item
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Retry failed';
        setQueue((prev) =>
          prev.map((item) =>
            item.id === failedItem.id
              ? { ...item, status: 'failed', error: message }
              : item
          )
        );
      }
    }

    setIsRunning(false);
    await fetchAssets();
  };

  const handleDownloadAllAsZip = async () => {
    try {
      const completedAssets = queue
        .filter((q) => q.savedAsset)
        .map((q) => q.savedAsset!.id);

      if (completedAssets.length > 0) {
        await downloadService.downloadBatchAsZip(completedAssets);
        toast.success(`Downloaded ${completedAssets.length} processed images as ZIP`);
      } else {
        toast.error('No processed assets to download yet');
      }
    } catch {
      toast.error('Failed to create ZIP download');
    }
  };

  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const skippedCount = queue.filter((q) => q.status === 'skipped').length;
  const failedCount = queue.filter((q) => q.status === 'failed').length;
  const totalCount = queue.length;
  const overallProgress = totalCount > 0 ? Math.round(((completedCount + skippedCount + failedCount) / totalCount) * 100) : 0;

  const totalOriginalBytes = queue
    .filter((q) => q.status === 'completed')
    .reduce((acc, q) => acc + q.asset.currentSize, 0);
  const totalOutputBytes = queue
    .filter((q) => q.status === 'completed' && q.outputSize)
    .reduce((acc, q) => acc + (q.outputSize || 0), 0);
  const netBytesSaved = totalOriginalBytes - totalOutputBytes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={isRunning ? undefined : onClose} />

      <div className="relative z-10 w-full max-w-4xl h-[88vh] rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#262634] shadow-xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-[#23232c] flex items-center justify-between bg-zinc-50/50 dark:bg-[#14141a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Batch Processing Queue</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
                  {totalCount} images
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Transform whole selections with automated skip rules, per-image tracking & lineage.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {stage === 'configure' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* 1. Operation Selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                Select Batch Operation
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { id: 'compress', label: 'Compress', icon: Minimize2 },
                  { id: 'resize', label: 'Resize', icon: Maximize2 },
                  { id: 'convert', label: 'Convert', icon: RefreshCw },
                  { id: 'bg-remove', label: 'AI Remove BG', icon: Sparkles },
                  { id: 'watermark', label: 'Watermark', icon: Stamp },
                  { id: 'recipe', label: 'Smart Recipe', icon: Wand2 },
                ].map((op) => {
                  const Icon = op.icon;
                  const isSelected = config.operationType === op.id;
                  return (
                    <button
                      key={op.id}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          operationType: op.id as BatchOperationType,
                        }))
                      }
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-colors ${
                        isSelected
                          ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold'
                          : 'bg-white dark:bg-[#16161c] border-zinc-200 dark:border-[#252532] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1.5 text-zinc-700 dark:text-zinc-300" />
                      <span className="text-xs font-medium">{op.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Operation Detailed Configuration */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#16161c] border border-zinc-200 dark:border-[#252532] space-y-4">
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                <span>Operation Parameters</span>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">
                  {config.operationType}
                </span>
              </div>

              {config.operationType === 'compress' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Target Format</label>
                    <select
                      value={config.compressConfig.format}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          compressConfig: {
                            ...prev.compressConfig,
                            format: e.target.value as any,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    >
                      <option value="image/webp">WebP (High efficiency, web standard)</option>
                      <option value="image/jpeg">JPEG (Universal compatibility)</option>
                      <option value="image/png">PNG (Lossless compression)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-600 dark:text-zinc-400">Quality</span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                        {Math.round(config.compressConfig.quality * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={1.0}
                      step={0.05}
                      value={config.compressConfig.quality}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          compressConfig: {
                            ...prev.compressConfig,
                            quality: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-zinc-900 dark:accent-zinc-100"
                    />
                  </div>
                </div>
              )}

              {config.operationType === 'resize' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Mode</label>
                    <select
                      value={config.resizeConfig.mode}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          resizeConfig: {
                            ...prev.resizeConfig,
                            mode: e.target.value as any,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0e0e12] border border-zinc-200 dark:border-[#2b2b38] text-xs text-zinc-800 dark:text-zinc-200"
                    >
                      <option value="max-bounds">Max Bounds (Fit Inside)</option>
                      <option value="exact">Exact Width & Height</option>
                      <option value="scale">Percentage Scale</option>
                    </select>
                  </div>

                  {config.resizeConfig.mode === 'scale' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">Scale Percentage</label>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={config.resizeConfig.scalePercent}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            resizeConfig: {
                              ...prev.resizeConfig,
                              scalePercent: parseInt(e.target.value) || 50,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0e0e12] border border-zinc-200 dark:border-[#2b2b38] text-xs text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-400">Target Width (px)</label>
                        <input
                          type="number"
                          value={config.resizeConfig.width}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              resizeConfig: {
                                ...prev.resizeConfig,
                                width: parseInt(e.target.value) || 1200,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0e0e12] border border-zinc-200 dark:border-[#2b2b38] text-xs text-zinc-800 dark:text-zinc-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-400">Target Height (px)</label>
                        <input
                          type="number"
                          value={config.resizeConfig.height}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              resizeConfig: {
                                ...prev.resizeConfig,
                                height: parseInt(e.target.value) || 800,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0e0e12] border border-zinc-200 dark:border-[#2b2b38] text-xs text-zinc-800 dark:text-zinc-200"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {config.operationType === 'convert' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Convert All to Format</label>
                  <select
                    value={config.convertConfig.targetFormat}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        convertConfig: {
                          targetFormat: e.target.value as any,
                        },
                      }))
                    }
                    className="w-full sm:w-1/2 px-3 py-2 rounded-lg bg-white dark:bg-[#0e0e12] border border-zinc-200 dark:border-[#2b2b38] text-xs text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="image/webp">WebP (.webp)</option>
                    <option value="image/avif">AVIF (.avif)</option>
                    <option value="image/png">PNG (.png)</option>
                    <option value="image/jpeg">JPEG (.jpg)</option>
                    <option value="image/x-icon">ICO Favicon (.ico)</option>
                    <option value="application/pdf">PDF Document (.pdf)</option>
                    <option value="image/bmp">BMP Bitmap (.bmp)</option>
                  </select>
                </div>
              )}

              {config.operationType === 'bg-remove' && (
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>Uses deep learning neural segmentation to isolate foreground subjects across all selected images.</p>
                  <p className="text-[11px] text-zinc-500">Output format will automatically be preserved as transparent PNG.</p>
                </div>
              )}

              {config.operationType === 'watermark' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Watermark Text</label>
                    <input
                      type="text"
                      value={config.watermarkConfig.text}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          watermarkConfig: { ...prev.watermarkConfig, text: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0e0e12] border border-zinc-200 dark:border-[#2b2b38] text-xs text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Position</label>
                    <select
                      value={config.watermarkConfig.position}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          watermarkConfig: { ...prev.watermarkConfig, position: e.target.value as any },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0e0e12] border border-zinc-200 dark:border-[#2b2b38] text-xs text-zinc-800 dark:text-zinc-200"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="center">Center</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Opacity ({Math.round(config.watermarkConfig.opacity * 100)}%)</label>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={config.watermarkConfig.opacity}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          watermarkConfig: { ...prev.watermarkConfig, opacity: parseFloat(e.target.value) },
                        }))
                      }
                      className="w-full accent-lime-400"
                    />
                  </div>
                </div>
              )}

              {config.operationType === 'recipe' && (
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Choose Reusable Recipe</label>
                  <select
                    value={config.recipeId || ''}
                    onChange={(e) => {
                      const id = e.target.value;
                      const recipe = recipes.find((r) => r.id === id) || null;
                      setConfig((prev) => ({
                        ...prev,
                        recipeId: id,
                        selectedRecipe: recipe,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0e0e12] border border-zinc-200 dark:border-[#2b2b38] text-xs text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="">Select a recipe...</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.steps.length} steps)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 2. Skip Rules Engine */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                Smart Skip Rules (Avoid Redundant Work)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 dark:bg-[#16161c] p-4 rounded-xl border border-zinc-200 dark:border-[#252532] text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={config.skipRules.skipIfAlreadyTargetFormat}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        skipRules: { ...prev.skipRules, skipIfAlreadyTargetFormat: e.target.checked },
                      }))
                    }
                    className="accent-zinc-900 dark:accent-zinc-100 rounded"
                  />
                  <span>Skip images already in target format</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={config.skipRules.skipIfDimensionsMet}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        skipRules: { ...prev.skipRules, skipIfDimensionsMet: e.target.checked },
                      }))
                    }
                    className="accent-zinc-900 dark:accent-zinc-100 rounded"
                  />
                  <span>Skip if dimensions already meet target bounds</span>
                </label>

                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <span>Skip files already under</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={config.skipRules.skipIfSmallerThanKB ?? 0}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        skipRules: { ...prev.skipRules, skipIfSmallerThanKB: parseInt(e.target.value) || 0 },
                      }))
                    }
                    className="w-20 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 font-mono text-center"
                  />
                  <span>KB</span>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={config.skipRules.skipIfAlreadyProcessed}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        skipRules: { ...prev.skipRules, skipIfAlreadyProcessed: e.target.checked },
                      }))
                    }
                    className="accent-zinc-900 dark:accent-zinc-100 rounded"
                  />
                  <span>Skip already derived variants (process originals only)</span>
                </label>
              </div>
            </div>

            {/* 3. Destination Project / Library */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <FolderInput className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                Destination & Saving
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-50 dark:bg-[#16161c] p-4 rounded-xl border border-zinc-200 dark:border-[#252532]">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-zinc-500 dark:text-zinc-400">Save Results into Project Folder</label>
                  <select
                    value={config.destinationProjectId || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        destinationProjectId: e.target.value || null,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0e0e12] border border-zinc-200 dark:border-[#2b2b38] text-xs text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="">General Library (Unassigned)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer pt-4 sm:pt-0">
                  <input
                    type="checkbox"
                    checked={config.saveToLibrary}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, saveToLibrary: e.target.checked }))
                    }
                    className="accent-zinc-900 dark:accent-zinc-100 rounded"
                  />
                  <span>Save each output as a version in library</span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          /* Live Queue Execution Stage */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Live Metrics Bar */}
            <div className="px-5 py-3 border-b border-zinc-200 dark:border-[#23232c] bg-zinc-50/80 dark:bg-[#14141a] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  {completedCount} Completed
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {skippedCount} Skipped
                </span>
                {failedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-red-400 font-medium">
                    <AlertCircle className="w-4 h-4" />
                    {failedCount} Failed
                  </span>
                )}
              </div>

              {netBytesSaved > 0 && (
                <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  Saved {formatBytes(netBytesSaved)} ({Math.round((netBytesSaved / totalOriginalBytes) * 100)}% reduction)
                </div>
              )}
            </div>

            {/* Overall Progress Meter */}
            <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>

            {/* Queue Item Rows */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {queue.map((item) => {
                const sizeChange = item.outputSize
                  ? item.outputSize - item.asset.currentSize
                  : 0;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-colors ${
                      item.status === 'processing'
                        ? 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700'
                        : item.status === 'completed'
                        ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                        : item.status === 'skipped'
                        ? 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-75'
                        : item.status === 'failed'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 max-w-[55%]">
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden font-mono text-[10px] text-zinc-500">
                        {item.asset.filename.slice(-3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate" title={item.asset.filename}>
                          {item.asset.filename}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                          {formatBytes(item.asset.currentSize)} · {item.asset.width}×{item.asset.height}px
                        </div>
                      </div>
                    </div>

                    {/* Status & Progress */}
                    <div className="flex items-center gap-3">
                      {item.status === 'processing' && (
                        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent animate-spin" />
                          <span className="text-[11px]">{item.stepDescription || 'Processing...'}</span>
                        </div>
                      )}

                      {item.status === 'completed' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                            → {formatBytes(item.outputSize || 0)}
                          </span>
                          {sizeChange < 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-semibold border border-emerald-500/20">
                              -{Math.round(Math.abs(sizeChange / item.asset.currentSize) * 100)}%
                            </span>
                          )}
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      )}

                      {item.status === 'skipped' && (
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                            Skipped: {item.skipReason}
                          </span>
                        </div>
                      )}

                      {item.status === 'failed' && (
                        <div className="flex items-center gap-2 text-red-400">
                          <span className="text-[11px] truncate max-w-[200px]" title={item.error}>
                            {item.error}
                          </span>
                        </div>
                      )}

                      {item.status === 'pending' && (
                        <span className="text-zinc-500 flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          Queued
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-[#23232c] flex items-center justify-between bg-zinc-50/50 dark:bg-[#14141a]">
          {stage === 'configure' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleStartQueue}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Batch ({totalCount} Images)</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {failedCount > 0 && !isRunning && (
                  <button
                    onClick={handleRetryFailed}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Failed ({failedCount})</span>
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={() => {
                      abortControllerRef.current = true;
                      setIsRunning(false);
                      toast('Batch cancelled by user');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-medium"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Stop Queue</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAllAsZip}
                  disabled={completedCount === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Download ZIP</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
