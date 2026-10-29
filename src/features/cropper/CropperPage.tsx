import React, { useState, useRef } from 'react';
import { Crop, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, RefreshCw, Play, Sparkles, Sliders } from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import { ProcessingResultPanel } from '@/components/common/ProcessingResultPanel';
import { canvasProcessor } from '@/services/image-processing/canvasProcessor';
import { ImageAsset } from '@/types';
import { toast } from 'sonner';

type AspectPreset = 'free' | '1:1' | '16:9' | '4:3' | '3:2' | '9:16' | '5:4';

export const CropperPage: React.FC = () => {
  const [aspect, setAspect] = useState<AspectPreset>('free');
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Normalized crop rectangle (0 to 1 scale)
  const [crop, setCrop] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    blob: Blob;
    width: number;
    height: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleAssetLoaded = (asset: ImageAsset | null) => {
    if (asset) {
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
    }
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspect('free');
    setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  };

  const handleAspectChange = (preset: AspectPreset, asset: ImageAsset | null) => {
    setAspect(preset);
    if (!asset || preset === 'free') return;

    const [num, den] = preset.split(':').map(Number);
    const targetRatio = num / den;

    const w = 0.8;
    const h = (w * asset.width) / (asset.height * targetRatio);
    setCrop({
      x: Math.max(0, (1 - w) / 2),
      y: Math.max(0, (1 - Math.min(0.9, h)) / 2),
      w: w,
      h: Math.min(0.9, h),
    });
  };

  const handleProcess = async (asset: ImageAsset | null, blob: Blob | null) => {
    if (!asset || !blob) {
      toast.error('Please select an image first');
      return;
    }

    setProcessing(true);
    try {
      const isSideways = Math.abs(rotation % 180) === 90;
      const naturalW = isSideways ? asset.height : asset.width;
      const naturalH = isSideways ? asset.width : asset.height;

      const pixelCrop = {
        x: Math.round(crop.x * naturalW),
        y: Math.round(crop.y * naturalH),
        width: Math.round(crop.w * naturalW),
        height: Math.round(crop.h * naturalH),
      };

      const output = await canvasProcessor.cropImage(
        blob,
        pixelCrop,
        rotation,
        flipH,
        flipV,
        asset.mimeType
      );
      setResult(output);
      toast.success('Crop and rotation applied');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Crop failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Image Cropper & Rotate"
      description="Crop to freeform or locked aspect ratios, rotate by degrees, and flip horizontally or vertically."
      icon={Crop}
      onAssetChange={handleAssetLoaded}
      onClear={() => setResult(null)}
      previewContent={(selectedAsset, blob) => {
        if (!selectedAsset || !blob) return null;
        return (
          <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center relative p-4 select-none overflow-hidden"
          >
            {/* Transformed Image Preview */}
            <div
              className="relative max-h-[460px] max-w-full flex items-center justify-center transition-transform duration-200"
              style={{
                transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
              }}
            >
              <img
                src={URL.createObjectURL(blob)}
                alt="Source preview"
                className="max-h-[440px] max-w-full object-contain rounded-lg shadow-lg pointer-events-none"
              />
            </div>

            {/* Visual Crop Overlay Guidelines */}
            <div className="absolute inset-4 pointer-events-none border border-lime-400/60 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-30">
                <div className="border-r border-b border-lime-400" />
                <div className="border-r border-b border-lime-400" />
                <div className="border-b border-lime-400" />
                <div className="border-r border-b border-lime-400" />
                <div className="border-r border-b border-lime-400" />
                <div className="border-b border-lime-400" />
                <div className="border-r border-lime-400" />
                <div className="border-r border-lime-400" />
                <div />
              </div>
            </div>

            {/* Specs Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-3 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono">
              <span className="text-zinc-400">Aspect Ratio: {aspect.toUpperCase()}</span>
              <span className="text-lime-400 font-bold">{rotation}° / {flipH ? 'Flipped H' : 'Standard'}</span>
            </div>
          </div>
        );
      }}
    >
      {(selectedAsset, blob) => (
        <div className="space-y-5 p-5 rounded-2xl bg-[#141419] border border-[#23232c] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#23232c]">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Crop & Orientation
            </h3>
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1 transition-colors"
              title="Reset transformations"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Aspect Ratio Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Aspect Ratio Preset</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['free', '1:1', '16:9', '4:3', '3:2', '9:16', '5:4'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAspectChange(preset, selectedAsset)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold uppercase border transition-all ${
                    aspect === preset
                      ? 'bg-lime-400/15 border-lime-400 text-lime-400 shadow-sm'
                      : 'bg-[#0e0e12] border-[#252530] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation & Flip Controls */}
          <div className="space-y-2 pt-2 border-t border-[#23232c]">
            <label className="text-xs font-semibold text-zinc-300">Orientation & Flips</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90) % 360)}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-[#0e0e12] border border-[#252530] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                title="Rotate 90° CCW"
              >
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-mono">-90°</span>
              </button>

              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-[#0e0e12] border border-[#252530] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                title="Rotate 90° CW"
              >
                <RotateCw className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-mono">+90°</span>
              </button>

              <button
                type="button"
                onClick={() => setFlipH((f) => !f)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-colors ${
                  flipH
                    ? 'bg-lime-400/10 border-lime-400/40 text-lime-400'
                    : 'bg-[#0e0e12] border-[#252530] text-zinc-300 hover:bg-zinc-800'
                }`}
                title="Flip Horizontally"
              >
                <FlipHorizontal className="w-4 h-4" />
                <span className="text-[10px]">Flip H</span>
              </button>

              <button
                type="button"
                onClick={() => setFlipV((f) => !f)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-colors ${
                  flipV
                    ? 'bg-lime-400/10 border-lime-400/40 text-lime-400'
                    : 'bg-[#0e0e12] border-[#252530] text-zinc-300 hover:bg-zinc-800'
                }`}
                title="Flip Vertically"
              >
                <FlipVertical className="w-4 h-4" />
                <span className="text-[10px]">Flip V</span>
              </button>
            </div>
          </div>

          {/* Process Button */}
          <button
            disabled={!selectedAsset || processing}
            onClick={() => handleProcess(selectedAsset, blob)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-black" />
                <span>Applying Transformations...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black" />
                <span>Crop & Export</span>
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
              variantType="cropped"
              metadata={{
                aspect,
                rotation,
                flipH,
                flipV,
              }}
              onClose={() => setResult(null)}
            />
          )}
        </div>
      )}
    </ToolLayout>
  );
};
