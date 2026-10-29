import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
  Play,
  Sparkles,
  Sliders,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import { ProcessingResultPanel } from '@/components/common/ProcessingResultPanel';
import { canvasProcessor } from '@/services/image-processing/canvasProcessor';
import { ImageAsset } from '@/types';
import { toast } from 'sonner';

type AspectPreset = 'free' | '1:1' | '16:9' | '4:3' | '3:2' | '9:16' | '5:4';
type DragHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'move';

export const CropperPage: React.FC = () => {
  const [aspect, setAspect] = useState<AspectPreset>('free');
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Normalized crop rectangle: 0 to 1 relative to displayed image bounds
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0.1,
    y: 0.1,
    w: 0.8,
    h: 0.8,
  });

  // Memoized stable object URL for the image
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Active dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<DragHandle | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialCrop, setInitialCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Zoom / Viewport
  const [zoom, setZoom] = useState<number>(100);

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    blob: Blob;
    width: number;
    height: number;
  } | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
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

    // Maintain aspect ratio relative to natural pixel dimensions
    const isSideways = Math.abs(rotation % 180) === 90;
    const imgW = isSideways ? asset.height : asset.width;
    const imgH = isSideways ? asset.width : asset.height;
    const imgRatio = imgW / imgH;

    let newW = 0.8;
    let newH = (newW * imgRatio) / targetRatio;

    if (newH > 0.85) {
      newH = 0.85;
      newW = (newH * targetRatio) / imgRatio;
    }

    setCrop({
      x: Math.max(0, (1 - newW) / 2),
      y: Math.max(0, (1 - newH) / 2),
      w: Math.min(1, newW),
      h: Math.min(1, newH),
    });
  };

  // Start dragging a handle or the box (touch + mouse compatible)
  const handlePointerDownHandle = (
    e: React.MouseEvent | React.PointerEvent,
    handle: DragHandle
  ) => {
    e.stopPropagation();
    setIsDragging(true);
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialCrop({ ...crop });
  };

  // Move handler attached to window for smooth dragging
  const handleMove = useCallback(
    (e: MouseEvent | PointerEvent) => {
      if (!isDragging || !activeHandle || !dragStart || !initialCrop || !imageRef.current) return;

      const imgRect = imageRef.current.getBoundingClientRect();
      if (imgRect.width <= 0 || imgRect.height <= 0) return;

      // Delta in normalized 0..1 scale
      const dx = (e.clientX - dragStart.x) / imgRect.width;
      const dy = (e.clientY - dragStart.y) / imgRect.height;

      let { x, y, w, h } = initialCrop;
      const minSize = 0.05;

      if (activeHandle === 'move') {
        x = Math.max(0, Math.min(1 - w, initialCrop.x + dx));
        y = Math.max(0, Math.min(1 - h, initialCrop.y + dy));
      } else {
        // Handle directional resizing
        if (activeHandle.includes('e')) {
          w = Math.max(minSize, Math.min(1 - initialCrop.x, initialCrop.w + dx));
        }
        if (activeHandle.includes('w')) {
          const maxLeftMove = initialCrop.w - minSize;
          const deltaLeft = Math.max(-initialCrop.x, Math.min(maxLeftMove, dx));
          x = initialCrop.x + deltaLeft;
          w = initialCrop.w - deltaLeft;
        }
        if (activeHandle.includes('s')) {
          h = Math.max(minSize, Math.min(1 - initialCrop.y, initialCrop.h + dy));
        }
        if (activeHandle.includes('n')) {
          const maxTopMove = initialCrop.h - minSize;
          const deltaTop = Math.max(-initialCrop.y, Math.min(maxTopMove, dy));
          y = initialCrop.y + deltaTop;
          h = initialCrop.h - deltaTop;
        }

        // Apply aspect ratio lock if active
        if (aspect !== 'free') {
          const [num, den] = aspect.split(':').map(Number);
          const targetRatio = num / den;
          const imgRatio = imgRect.width / imgRect.height;
          
          if (activeHandle === 'n' || activeHandle === 's') {
            // Adjust width from height
            const reqW = (h * targetRatio) / imgRatio;
            w = Math.max(minSize, Math.min(1 - x, reqW));
          } else {
            // Adjust height from width
            const reqH = (w * imgRatio) / targetRatio;
            h = Math.max(minSize, Math.min(1 - y, reqH));
          }
        }
      }

      setCrop({
        x: Math.max(0, Math.min(1 - minSize, x)),
        y: Math.max(0, Math.min(1 - minSize, y)),
        w: Math.max(minSize, Math.min(1 - x, w)),
        h: Math.max(minSize, Math.min(1 - y, h)),
      });
    },
    [isDragging, activeHandle, dragStart, initialCrop, aspect]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setActiveHandle(null);
    setDragStart(null);
    setInitialCrop(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handlePointerUp);
      };
    }
  }, [isDragging, handleMove, handlePointerUp]);

  // Execute processing
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

  // Manage stable object URL for the image
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  return (
    <ToolLayout
      title="Image Cropper & Rotate"
      description="Interactive freeform or locked aspect ratio cropping, rotation, and flipping with live handles."
      icon={Crop}
      onAssetChange={handleAssetLoaded}
      onClear={() => setResult(null)}
      previewContent={(selectedAsset, blob) => {
        if (!selectedAsset || !blob) return null;

        // Keep stable blob URL
        if (!blobUrl) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }

        const isSideways = Math.abs(rotation % 180) === 90;
        const currentNaturalW = isSideways ? selectedAsset.height : selectedAsset.width;
        const currentNaturalH = isSideways ? selectedAsset.width : selectedAsset.height;

        const cropPixelW = Math.round(crop.w * currentNaturalW);
        const cropPixelH = Math.round(crop.h * currentNaturalH);

        return (
          <div
            ref={containerRef}
            className="w-full h-full flex flex-col justify-between items-center relative select-none overflow-hidden"
          >
            {/* Viewport Top Bar */}
            <div className="w-full flex items-center justify-between px-4 py-2 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 z-20 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <Crop className="w-3.5 h-3.5 text-lime-400" />
                <span>
                  Crop Area: <strong className="font-mono text-lime-300 font-bold">{cropPixelW} × {cropPixelH} px</strong>
                </span>
                <span>•</span>
                <span className="uppercase text-zinc-300">{aspect}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(40, z - 20))}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] text-zinc-400 min-w-10 text-center">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(250, z + 20))}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  title="Reset Zoom"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Image & Crop Area */}
            <div className="flex-1 w-full flex items-center justify-center p-4 sm:p-6 overflow-auto relative">
              <div
                className="relative inline-block transition-transform duration-75"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Target Image */}
                <img
                  ref={imageRef}
                  src={blobUrl || URL.createObjectURL(blob)}
                  alt="Crop Target"
                  className="max-h-[640px] max-w-full object-contain block rounded shadow-2xl pointer-events-none"
                />

                {/* Interactive Crop Boundary Box */}
                <div
                  ref={cropBoxRef}
                  className="absolute border-2 border-lime-400 z-10"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.w * 100}%`,
                    height: `${crop.h * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                  }}
                >
                  {/* Center Reposition Grab Area */}
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'move')}
                    onMouseDown={(e) => handlePointerDownHandle(e, 'move')}
                    className="absolute inset-2 cursor-move z-10 touch-none"
                    title="Drag to reposition crop area"
                  />

                  {/* Rule of Thirds Grid Guidelines */}
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-lime-300" />
                    <div className="border-r border-b border-lime-300" />
                    <div className="border-b border-lime-300" />
                    <div className="border-r border-b border-lime-300" />
                    <div className="border-r border-b border-lime-300" />
                    <div className="border-b border-lime-300" />
                    <div className="border-r border-lime-300" />
                    <div className="border-r border-lime-300" />
                    <div />
                  </div>

                  {/* Top Edge Sliding Zone */}
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'n')}
                    onMouseDown={(e) => handlePointerDownHandle(e, 'n')}
                    className="absolute -top-3 left-3 right-3 h-6 cursor-ns-resize z-20 flex items-center justify-center group touch-none"
                    title="Drag top edge"
                  >
                    <div className="w-10 h-1.5 bg-lime-400 rounded-full border border-black shadow group-hover:scale-110 transition-transform" />
                  </div>

                  {/* Bottom Edge Sliding Zone */}
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 's')}
                    onMouseDown={(e) => handlePointerDownHandle(e, 's')}
                    className="absolute -bottom-3 left-3 right-3 h-6 cursor-ns-resize z-20 flex items-center justify-center group touch-none"
                    title="Drag bottom edge"
                  >
                    <div className="w-10 h-1.5 bg-lime-400 rounded-full border border-black shadow group-hover:scale-110 transition-transform" />
                  </div>

                  {/* Left Edge Sliding Zone */}
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'w')}
                    onMouseDown={(e) => handlePointerDownHandle(e, 'w')}
                    className="absolute -left-3 top-3 bottom-3 w-6 cursor-ew-resize z-20 flex items-center justify-center group touch-none"
                    title="Drag left edge"
                  >
                    <div className="w-1.5 h-10 bg-lime-400 rounded-full border border-black shadow group-hover:scale-110 transition-transform" />
                  </div>

                  {/* Right Edge Sliding Zone */}
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'e')}
                    onMouseDown={(e) => handlePointerDownHandle(e, 'e')}
                    className="absolute -right-3 top-3 bottom-3 w-6 cursor-ew-resize z-20 flex items-center justify-center group touch-none"
                    title="Drag right edge"
                  >
                    <div className="w-1.5 h-10 bg-lime-400 rounded-full border border-black shadow group-hover:scale-110 transition-transform" />
                  </div>

                  {/* 4 Corner Handles */}
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'nw')}
                    onMouseDown={(e) => handlePointerDownHandle(e, 'nw')}
                    className="absolute -top-3 -left-3 w-6 h-6 flex items-center justify-center cursor-nwse-resize z-30 touch-none"
                    title="Resize top-left"
                  >
                    <div className="w-3.5 h-3.5 bg-lime-400 border-2 border-black rounded-sm shadow-md" />
                  </div>
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'ne')}
                    onMouseDown={(e) => handlePointerDownHandle(e, 'ne')}
                    className="absolute -top-3 -right-3 w-6 h-6 flex items-center justify-center cursor-nesw-resize z-30 touch-none"
                    title="Resize top-right"
                  >
                    <div className="w-3.5 h-3.5 bg-lime-400 border-2 border-black rounded-sm shadow-md" />
                  </div>
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'se')}
                    onMouseDown={(e) => handlePointerDownHandle(e, 'se')}
                    className="absolute -bottom-3 -right-3 w-6 h-6 flex items-center justify-center cursor-nwse-resize z-30 touch-none"
                    title="Resize bottom-right"
                  >
                    <div className="w-3.5 h-3.5 bg-lime-400 border-2 border-black rounded-sm shadow-md" />
                  </div>
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'sw')}
                    onMouseDown={(e) => handlePointerDownHandle(e, 'sw')}
                    className="absolute -bottom-3 -left-3 w-6 h-6 flex items-center justify-center cursor-nesw-resize z-30 touch-none"
                    title="Resize bottom-left"
                  >
                    <div className="w-3.5 h-3.5 bg-lime-400 border-2 border-black rounded-sm shadow-md" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Tip Bar */}
            <div className="py-1.5 px-3 rounded-full bg-black/80 backdrop-blur-md border border-zinc-800 text-[11px] text-zinc-400 mb-2">
              Drag edge bars to slide sides. Drag corners to scale. Drag inside box to reposition.
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
