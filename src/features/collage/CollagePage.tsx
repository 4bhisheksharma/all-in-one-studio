import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Play,
  Sparkles,
  Sliders,
  FolderOpen,
  Palette,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { AssetPickerDialog } from '@/components/image-picker/AssetPickerDialog';
import { ProcessingResultPanel } from '@/components/common/ProcessingResultPanel';
import { assetService } from '@/services/storage/assetService';
import { ImageAsset } from '@/types';
import { toast } from 'sonner';

interface LayoutSlot {
  x: number; // 0 to 1
  y: number; // 0 to 1
  w: number; // 0 to 1
  h: number; // 0 to 1
}

interface CollageLayout {
  id: string;
  name: string;
  slots: LayoutSlot[];
}

const COLLAGE_LAYOUTS: CollageLayout[] = [
  {
    id: '2-horizontal',
    name: '2 Split (Side by Side)',
    slots: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  {
    id: '2-vertical',
    name: '2 Stacked (Top & Bottom)',
    slots: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  {
    id: '3-split-left',
    name: '3 (1 Large Left, 2 Right)',
    slots: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: '3-columns',
    name: '3 Equal Columns',
    slots: [
      { x: 0, y: 0, w: 0.333, h: 1 },
      { x: 0.333, y: 0, w: 0.334, h: 1 },
      { x: 0.667, y: 0, w: 0.333, h: 1 },
    ],
  },
  {
    id: '4-grid',
    name: '4 Grid (2 × 2)',
    slots: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: '4-featured',
    name: '4 (1 Top, 3 Bottom)',
    slots: [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.6, w: 0.333, h: 0.4 },
      { x: 0.333, y: 0.6, w: 0.334, h: 0.4 },
      { x: 0.667, y: 0, w: 0.333, h: 0.4 },
    ],
  },
];

export const CollagePage: React.FC = () => {
  const [selectedLayout, setSelectedLayout] = useState<CollageLayout>(COLLAGE_LAYOUTS[4]); // 4-grid default
  const [slotAssets, setSlotAssets] = useState<(ImageAsset | null)[]>([null, null, null, null]);
  const [slotImages, setSlotImages] = useState<(HTMLImageElement | null)[]>([null, null, null, null]);

  // Styling & Spacing
  const [canvasWidth, setCanvasWidth] = useState<number>(1200);
  const [canvasHeight, setCanvasHeight] = useState<number>(1200);
  const [gap, setGap] = useState<number>(16);
  const [padding, setPadding] = useState<number>(16);
  const [cornerRadius, setCornerRadius] = useState<number>(12);
  const [bgColor, setBgColor] = useState<string>('#0a0a0c');

  // Modals
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);

  const [result, setResult] = useState<{
    blob: Blob;
    width: number;
    height: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // When layout changes, resize slot arrays
  const handleSelectLayout = (layout: CollageLayout) => {
    setSelectedLayout(layout);
    setSlotAssets((prev) => {
      const next = new Array(layout.slots.length).fill(null);
      for (let i = 0; i < Math.min(prev.length, next.length); i++) {
        next[i] = prev[i];
      }
      return next;
    });
    setSlotImages((prev) => {
      const next = new Array(layout.slots.length).fill(null);
      for (let i = 0; i < Math.min(prev.length, next.length); i++) {
        next[i] = prev[i];
      }
      return next;
    });
  };

  // Assign image asset to a slot
  const handleAssetPicked = async (assets: ImageAsset[]) => {
    if (assets.length === 0 || activeSlotIndex === null) return;
    const asset = assets[0];

    const blob = await assetService.getAssetBlob(asset.id);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setSlotAssets((prev) => {
        const next = [...prev];
        next[activeSlotIndex] = asset;
        return next;
      });
      setSlotImages((prev) => {
        const next = [...prev];
        next[activeSlotIndex] = img;
        return next;
      });
    };
    img.src = url;
  };

  // Render live preview on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const innerW = canvasWidth - padding * 2;
    const innerH = canvasHeight - padding * 2;

    selectedLayout.slots.forEach((slot, index) => {
      const slotX = padding + slot.x * innerW + gap / 2;
      const slotY = padding + slot.y * innerH + gap / 2;
      const slotW = Math.max(1, slot.w * innerW - gap);
      const slotH = Math.max(1, slot.h * innerH - gap);

      ctx.save();

      // Rounded rectangle clipping path
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(slotX, slotY, slotW, slotH, cornerRadius);
      } else {
        ctx.rect(slotX, slotY, slotW, slotH);
      }
      ctx.clip();

      const img = slotImages[index];
      if (img) {
        // Draw image with 'cover' aspect ratio
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const slotRatio = slotW / slotH;
        let drawW = slotW;
        let drawH = slotH;
        let offsetX = slotX;
        let offsetY = slotY;

        if (imgRatio > slotRatio) {
          drawW = slotH * imgRatio;
          offsetX = slotX - (drawW - slotW) / 2;
        } else {
          drawH = slotW / imgRatio;
          offsetY = slotY - (drawH - slotH) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      } else {
        // Empty slot placeholder fill
        ctx.fillStyle = '#16161c';
        ctx.fillRect(slotX, slotY, slotW, slotH);

        // Placeholder outline and text
        ctx.strokeStyle = '#282834';
        ctx.lineWidth = 1;
        ctx.strokeRect(slotX, slotY, slotW, slotH);

        ctx.fillStyle = '#52525e';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`+ Slot ${index + 1}`, slotX + slotW / 2, slotY + slotH / 2);
      }

      ctx.restore();
    });
  }, [selectedLayout, slotImages, canvasWidth, canvasHeight, gap, padding, cornerRadius, bgColor]);

  // Export collage to high-DPI blob
  const handleExportCollage = async () => {
    const hasAtLeastOne = slotAssets.some(Boolean);
    if (!hasAtLeastOne) {
      toast.error('Please assign at least one image to the collage');
      return;
    }

    setProcessing(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas unavailable');

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setResult({
              blob,
              width: canvasWidth,
              height: canvasHeight,
            });
            toast.success('Collage rendered successfully');
          } else {
            toast.error('Failed to export collage canvas');
          }
          setProcessing(false);
        },
        'image/png',
        0.95
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Collage Maker</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl">
              Arrange multiple images from your library into customizable grid compositions.
            </p>
          </div>
        </div>

        <button
          disabled={processing}
          onClick={handleExportCollage}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {processing ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-white dark:text-zinc-900" />
              <span>Rendering Composition...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Export Collage</span>
            </>
          )}
        </button>
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls Column */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 space-y-5 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <Sliders className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              Layout & Grid Presets
            </h3>

            {/* Layout selector */}
            <div className="grid grid-cols-2 gap-2">
              {COLLAGE_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => handleSelectLayout(layout)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    selectedLayout.id === layout.id
                      ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                      : 'bg-zinc-50 dark:bg-[#0e0e12] border-zinc-200 dark:border-[#252530] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="text-xs font-semibold">{layout.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1">
                    {layout.slots.length} slots
                  </span>
                </button>
              ))}
            </div>

            {/* Slot Asset Assignment List */}
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Image Slots</label>
              <div className="space-y-2">
                {selectedLayout.slots.map((_, i) => {
                  const asset = slotAssets[i];
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-[#0e0e12] border border-zinc-200 dark:border-[#22222a]"
                    >
                      <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 pl-1">Slot {i + 1}</span>
                      <div className="flex items-center gap-2">
                        {asset ? (
                          <>
                            <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium truncate max-w-[130px]" title={asset.filename}>
                              {asset.filename}
                            </span>
                            <button
                              onClick={() => {
                                setSlotAssets((prev) => {
                                  const n = [...prev];
                                  n[i] = null;
                                  return n;
                                });
                                setSlotImages((prev) => {
                                  const n = [...prev];
                                  n[i] = null;
                                  return n;
                                });
                              }}
                              className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                              title="Clear slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveSlotIndex(i);
                              setPickerOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-medium transition-colors border border-zinc-200 dark:border-zinc-700"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                            <span>Select Image</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Styling Sliders */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Slot Gap</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{gap}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={gap}
                  onChange={(e) => setGap(Number(e.target.value))}
                  className="w-full accent-zinc-900 dark:accent-zinc-100 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Outer Margin</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{padding}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={padding}
                  onChange={(e) => setPadding(Number(e.target.value))}
                  className="w-full accent-zinc-900 dark:accent-zinc-100 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Corner Radius</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{cornerRadius}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={cornerRadius}
                  onChange={(e) => setCornerRadius(Number(e.target.value))}
                  className="w-full accent-zinc-900 dark:accent-zinc-100 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  {['#0a0a0c', '#141418', '#ffffff', '#e2e8f0', '#0f172a'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setBgColor(c)}
                      className={`w-7 h-7 rounded-lg border transition-transform ${
                        bgColor === c ? 'border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-400/40 scale-110 shadow-sm' : 'border-zinc-300 dark:border-zinc-700'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                    title="Custom color"
                  />
                </div>
              </div>

              {/* Resolution Select */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  Output Canvas Dimensions
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setCanvasWidth(1200);
                      setCanvasHeight(1200);
                    }}
                    className={`p-2 rounded-lg border text-center font-mono ${
                      canvasWidth === 1200 && canvasHeight === 1200
                        ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-sm font-semibold'
                        : 'bg-zinc-50 dark:bg-[#0e0e12] border-zinc-200 dark:border-[#22222a] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    1200 × 1200 (1:1)
                  </button>
                  <button
                    onClick={() => {
                      setCanvasWidth(1920);
                      setCanvasHeight(1080);
                    }}
                    className={`p-2 rounded-lg border text-center font-mono ${
                      canvasWidth === 1920 && canvasHeight === 1080
                        ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-sm font-semibold'
                        : 'bg-zinc-50 dark:bg-[#0e0e12] border-zinc-200 dark:border-[#22222a] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    1920 × 1080 (16:9)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Canvas Preview Viewport */}
        <div className="lg:col-span-7 xl:col-span-8 min-h-[500px] rounded-2xl bg-zinc-100 dark:bg-[#0e0e12] border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="max-w-full max-h-[540px] flex items-center justify-center overflow-hidden rounded-xl shadow-md border border-zinc-200/50 dark:border-white/5">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[520px] object-contain rounded-lg"
            />
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-zinc-900/90 dark:bg-black/80 backdrop-blur-md border border-zinc-700/50 dark:border-white/10 font-mono">
            <span className="text-zinc-400">Layout: {selectedLayout.name}</span>
            <span className="text-zinc-100 font-semibold">{canvasWidth} × {canvasHeight} px</span>
          </div>
        </div>
      </div>

      {/* Shared Asset Picker Modal */}
      <AssetPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose Image for Slot"
        onSelect={handleAssetPicked}
      />

      {/* Result Panel */}
      {result && (
        <ProcessingResultPanel
          sourceAsset={null}
          resultBlob={result.blob}
          outputWidth={result.width}
          outputHeight={result.height}
          variantType="collage"
          metadata={{
            layoutId: selectedLayout.id,
            canvasWidth,
            canvasHeight,
          }}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  );
};
