import React, { useState } from 'react';
import { Maximize2, Lock, Unlock, Play, Sparkles, Sliders } from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import { ProcessingResultPanel } from '@/components/common/ProcessingResultPanel';
import { canvasProcessor } from '@/services/image-processing/canvasProcessor';
import { ImageAsset } from '@/types';
import { toast } from 'sonner';

interface Preset {
  label: string;
  width: number;
  height: number;
}

const PRESETS: Preset[] = [
  { label: 'Instagram Square (1080×1080)', width: 1080, height: 1080 },
  { label: 'Instagram Story (1080×1920)', width: 1080, height: 1920 },
  { label: 'YouTube Thumbnail (1280×720)', width: 1280, height: 720 },
  { label: 'Twitter Header (1500×500)', width: 1500, height: 500 },
  { label: 'OpenGraph Image (1200×630)', width: 1200, height: 630 },
  { label: 'Full HD 1080p (1920×1080)', width: 1920, height: 1080 },
  { label: 'Profile Avatar (400×400)', width: 400, height: 400 },
];

export const ResizerPage: React.FC = () => {
  const [targetWidth, setTargetWidth] = useState<number>(0);
  const [targetHeight, setTargetHeight] = useState<number>(0);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [preventEnlarge, setPreventEnlarge] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    blob: Blob;
    width: number;
    height: number;
  } | null>(null);

  const handleAssetLoaded = (asset: ImageAsset | null) => {
    if (asset) {
      setTargetWidth(asset.width);
      setTargetHeight(asset.height);
      setAspectRatio(asset.width / asset.height);
    }
  };

  const handleWidthChange = (val: number) => {
    const w = Math.max(1, val);
    setTargetWidth(w);
    if (lockAspect && aspectRatio > 0) {
      setTargetHeight(Math.max(1, Math.round(w / aspectRatio)));
    }
  };

  const handleHeightChange = (val: number) => {
    const h = Math.max(1, val);
    setTargetHeight(h);
    if (lockAspect && aspectRatio > 0) {
      setTargetWidth(Math.max(1, Math.round(h * aspectRatio)));
    }
  };

  const handlePresetSelect = (preset: Preset) => {
    setLockAspect(false);
    setTargetWidth(preset.width);
    setTargetHeight(preset.height);
  };

  const handleProcess = async (asset: ImageAsset | null, blob: Blob | null) => {
    if (!asset || !blob) {
      toast.error('Please select an image first');
      return;
    }

    if (preventEnlarge && (targetWidth > asset.width || targetHeight > asset.height)) {
      toast.error('Output exceeds original dimensions with enlargement prevention enabled');
      return;
    }

    setProcessing(true);
    try {
      const output = await canvasProcessor.resizeImage(
        blob,
        targetWidth,
        targetHeight,
        asset.mimeType
      );
      setResult(output);
      toast.success('Resize complete');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resize failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Image Resizer"
      description="Scale dimensions by exact pixels, scale percentages, or standard social media templates."
      icon={Maximize2}
      onAssetChange={handleAssetLoaded}
      onClear={() => setResult(null)}
      previewContent={(selectedAsset, blob) => {
        if (!selectedAsset || !blob) return null;
        return (
          <div className="w-full h-full flex flex-col items-center justify-center relative p-2">
            <div className="relative max-h-[460px] max-w-full flex items-center justify-center">
              <img
                src={URL.createObjectURL(blob)}
                alt="Source preview"
                className="max-h-[440px] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/90 dark:bg-black/80 backdrop-blur-md border border-zinc-700/50 dark:border-white/10 text-xs font-mono">
              <span className="text-zinc-400">Original: {selectedAsset.width} × {selectedAsset.height} px</span>
              <span className="text-zinc-100 font-semibold">Target: {targetWidth} × {targetHeight} px</span>
            </div>
          </div>
        );
      }}
    >
      {(selectedAsset, blob) => (
        <div className="space-y-5 p-5 rounded-2xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              Resize Dimensions
            </h3>
            <button
              onClick={() => setLockAspect(!lockAspect)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                lockAspect
                  ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}
              title={lockAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
            >
              {lockAspect ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{lockAspect ? 'Locked' : 'Free'}</span>
            </button>
          </div>

          {/* Width & Height Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Width (pixels)</label>
              <input
                type="number"
                min="1"
                max="16000"
                value={targetWidth || ''}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Height (pixels)</label>
              <input
                type="number"
                min="1"
                max="16000"
                value={targetHeight || ''}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              />
            </div>
          </div>

          {/* Presets Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Social Media & Web Presets</label>
            <select
              onChange={(e) => {
                const p = PRESETS.find((item) => item.label === e.target.value);
                if (p) handlePresetSelect(p);
              }}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              defaultValue=""
            >
              <option value="" disabled>Select a preset dimension...</option>
              {PRESETS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Prevent Enlargement Toggle */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200">Prevent Accidental Upscaling</label>
              <p className="text-[11px] text-zinc-500">Stops output from exceeding source resolution</p>
            </div>
            <input
              type="checkbox"
              checked={preventEnlarge}
              onChange={(e) => setPreventEnlarge(e.target.checked)}
              className="w-4 h-4 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
            />
          </div>

          {/* Process Button */}
          <button
            disabled={!selectedAsset || processing}
            onClick={() => handleProcess(selectedAsset, blob)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-white dark:text-zinc-900" />
                <span>Resizing Image...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Apply Resize & Preview</span>
              </>
            )}
          </button>

          {/* Result Panel Modal Trigger */}
          {result && (
            <ProcessingResultPanel
              sourceAsset={selectedAsset}
              resultBlob={result.blob}
              outputWidth={result.width}
              outputHeight={result.height}
              variantType="resized"
              metadata={{
                targetWidth,
                targetHeight,
              }}
              onClose={() => setResult(null)}
            />
          )}
        </div>
      )}
    </ToolLayout>
  );
};
