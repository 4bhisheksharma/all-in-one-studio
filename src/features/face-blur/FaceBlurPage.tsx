import React, { useState, useRef, useEffect } from 'react';
import { EyeOff, Play, Sparkles, Sliders, Trash2, Undo2, Plus, ScanFace } from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import { ProcessingResultPanel } from '@/components/common/ProcessingResultPanel';
import { ImageAsset } from '@/types';
import { toast } from 'sonner';

interface BlurRegion {
  id: string;
  x: number; // in pixels relative to natural image dimensions
  y: number;
  width: number;
  height: number;
}

export const FaceBlurPage: React.FC = () => {
  const [blurStyle, setBlurStyle] = useState<'pixelate' | 'blur'>('pixelate');
  const [blurIntensity, setBlurIntensity] = useState<number>(18);
  const [regions, setRegions] = useState<BlurRegion[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  const [processing, setProcessing] = useState(false);
  const [detectingFaces, setDetectingFaces] = useState(false);
  const [result, setResult] = useState<{
    blob: Blob;
    width: number;
    height: number;
  } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  const handleAssetLoaded = () => {
    setRegions([]);
    setActiveRegionId(null);
    setResult(null);
  };

  // Pre-load the natural image object
  useEffect(() => {
    // When preview re-renders, redraw canvas
    renderCanvas();
  });

  const renderCanvas = () => {
    const canvas = previewCanvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw base image
    ctx.drawImage(img, 0, 0);

    // Apply blur/pixelation to each region
    regions.forEach((region) => {
      if (region.width <= 0 || region.height <= 0) return;

      const rw = Math.max(1, Math.round(region.width));
      const rh = Math.max(1, Math.round(region.height));
      const rx = Math.max(0, Math.round(region.x));
      const ry = Math.max(0, Math.round(region.y));

      if (blurStyle === 'pixelate') {
        // Pixelation effect: downscale subregion to small canvas, then draw back scaled up
        const factor = Math.max(2, Math.round(blurIntensity));
        const smallW = Math.max(1, Math.round(rw / factor));
        const smallH = Math.max(1, Math.round(rh / factor));

        const offCanvas = document.createElement('canvas');
        offCanvas.width = smallW;
        offCanvas.height = smallH;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
          offCtx.imageSmoothingEnabled = false;
          offCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, smallW, smallH);

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(offCanvas, 0, 0, smallW, smallH, rx, ry, rw, rh);
          ctx.imageSmoothingEnabled = true;
        }
      } else {
        // Repeated box blur
        ctx.save();
        ctx.filter = `blur(${Math.max(4, Math.round(blurIntensity / 2))}px)`;
        ctx.drawImage(img, rx, ry, rw, rh, rx, ry, rw, rh);
        ctx.restore();
      }

      // Draw subtle selection outline for user feedback
      ctx.strokeStyle = region.id === activeRegionId ? '#a3e635' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    });
  };

  // Mouse event handlers for interactive drawing over canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);

    // Update active drawing preview
    const tempId = 'drawing_temp';
    setRegions((prev) => {
      const filtered = prev.filter((r) => r.id !== tempId);
      return [...filtered, { id: tempId, x, y, width, height }];
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && startPos) {
      setRegions((prev) => {
        const temp = prev.find((r) => r.id === 'drawing_temp');
        const rest = prev.filter((r) => r.id !== 'drawing_temp');
        if (temp && temp.width > 10 && temp.height > 10) {
          const newId = crypto.randomUUID();
          setActiveRegionId(newId);
          return [...rest, { ...temp, id: newId }];
        }
        return rest;
      });
    }
    setIsDrawing(false);
    setStartPos(null);
  };

  const handleAddDefaultRegion = (asset: ImageAsset | null) => {
    if (!asset) return;
    const rw = Math.round(asset.width * 0.3);
    const rh = Math.round(asset.height * 0.3);
    const rx = Math.round((asset.width - rw) / 2);
    const ry = Math.round((asset.height - rh) / 2);

    const newRegion: BlurRegion = {
      id: crypto.randomUUID(),
      x: rx,
      y: ry,
      width: rw,
      height: rh,
    };
    setRegions((prev) => [...prev, newRegion]);
    setActiveRegionId(newRegion.id);
  };

  const handleUndo = () => {
    setRegions((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setRegions([]);
    setActiveRegionId(null);
  };

  // Face Detection (Client-Side)
  const handleDetectFaces = async (asset: ImageAsset | null) => {
    if (!asset || !imageObjRef.current) return;
    setDetectingFaces(true);

    try {
      // Check for browser-native FaceDetector API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ('FaceDetector' in window && typeof (window as any).FaceDetector === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const faceDetector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 10 });
        const faces = await faceDetector.detect(imageObjRef.current);

        if (faces && faces.length > 0) {
          const detectedRegions: BlurRegion[] = faces.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (f: any) => ({
              id: crypto.randomUUID(),
              x: Math.round(f.boundingBox.x),
              y: Math.round(f.boundingBox.y),
              width: Math.round(f.boundingBox.width),
              height: Math.round(f.boundingBox.height),
            })
          );
          setRegions((prev) => [...prev, ...detectedRegions]);
          toast.success(`Detected ${faces.length} face(s)`);
        } else {
          toast.info('No distinct faces detected automatically. Use manual selection.');
        }
      } else {
        // Heuristic fallback: create central face region
        handleAddDefaultRegion(asset);
        toast.info('Added manual face region (native hardware detector not active on this browser)');
      }
    } catch {
      handleAddDefaultRegion(asset);
    } finally {
      setDetectingFaces(false);
    }
  };

  // Process & Export Final Blurred Image
  const handleExport = async (asset: ImageAsset | null) => {
    if (!asset || regions.length === 0) {
      toast.error('Please create at least one blur region');
      return;
    }

    setProcessing(true);
    try {
      const canvas = previewCanvasRef.current;
      if (!canvas) throw new Error('Canvas not found');

      // Re-render strictly without dashed selection outlines
      const img = imageObjRef.current;
      if (img) {
        const outCanvas = document.createElement('canvas');
        outCanvas.width = img.naturalWidth;
        outCanvas.height = img.naturalHeight;
        const ctx = outCanvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0);

          regions.forEach((region) => {
            const rw = Math.max(1, Math.round(region.width));
            const rh = Math.max(1, Math.round(region.height));
            const rx = Math.max(0, Math.round(region.x));
            const ry = Math.max(0, Math.round(region.y));

            if (blurStyle === 'pixelate') {
              const factor = Math.max(2, Math.round(blurIntensity));
              const smallW = Math.max(1, Math.round(rw / factor));
              const smallH = Math.max(1, Math.round(rh / factor));

              const offCanvas = document.createElement('canvas');
              offCanvas.width = smallW;
              offCanvas.height = smallH;
              const offCtx = offCanvas.getContext('2d');
              if (offCtx) {
                offCtx.imageSmoothingEnabled = false;
                offCtx.drawImage(outCanvas, rx, ry, rw, rh, 0, 0, smallW, smallH);

                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(offCanvas, 0, 0, smallW, smallH, rx, ry, rw, rh);
                ctx.imageSmoothingEnabled = true;
              }
            } else {
              ctx.save();
              ctx.filter = `blur(${Math.max(4, Math.round(blurIntensity / 2))}px)`;
              ctx.drawImage(img, rx, ry, rw, rh, rx, ry, rw, rh);
              ctx.restore();
            }
          });

          outCanvas.toBlob(
            (blob) => {
              if (blob) {
                setResult({
                  blob,
                  width: outCanvas.width,
                  height: outCanvas.height,
                });
                toast.success('Blurred image created');
              } else {
                toast.error('Failed to export image');
              }
              setProcessing(false);
            },
            asset.mimeType || 'image/png',
            0.92
          );
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Face & Region Blur"
      description="Conceal faces, license plates, or sensitive documents using interactive blur and pixelation boxes."
      icon={EyeOff}
      onAssetChange={handleAssetLoaded}
      onClear={() => {
        setRegions([]);
        setResult(null);
      }}
      previewContent={(selectedAsset, blob) => {
        if (!selectedAsset || !blob) return null;

        // Load image into ref for canvas processing
        if (!imageObjRef.current || imageObjRef.current.dataset.id !== selectedAsset.id) {
          const img = new Image();
          img.dataset.id = selectedAsset.id;
          img.src = URL.createObjectURL(blob);
          img.onload = () => {
            imageObjRef.current = img;
            renderCanvas();
          };
        }

        return (
          <div className="w-full h-full flex flex-col items-center justify-center relative p-2 select-none overflow-hidden">
            <div className="relative max-h-[460px] max-w-full flex items-center justify-center">
              <canvas
                ref={previewCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="max-h-[440px] max-w-full object-contain rounded-lg shadow-lg cursor-crosshair border border-white/10"
              />
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-3 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono">
              <span className="text-zinc-400">Click & drag on image to draw blur box</span>
              <span className="text-lime-400 font-bold">{regions.length} region{regions.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        );
      }}
    >
      {(selectedAsset) => (
        <div className="space-y-5 p-5 rounded-2xl bg-[#141419] border border-[#23232c] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#23232c]">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Blur Controls
            </h3>
          </div>

          {/* Automatic Face Detection Button */}
          <button
            type="button"
            disabled={!selectedAsset || detectingFaces}
            onClick={() => handleDetectFaces(selectedAsset)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-semibold text-xs transition-colors"
          >
            <ScanFace className="w-4 h-4" />
            <span>{detectingFaces ? 'Scanning Faces...' : 'Auto-Detect Faces (On-Device)'}</span>
          </button>

          {/* Blur Style: Pixelate vs Blur */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Concealment Style</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBlurStyle('pixelate')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  blurStyle === 'pixelate'
                    ? 'bg-purple-400/15 border-purple-400 text-purple-300 shadow-sm'
                    : 'bg-[#0e0e12] border-[#252530] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Pixelate / Mosaic
              </button>
              <button
                type="button"
                onClick={() => setBlurStyle('blur')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  blurStyle === 'blur'
                    ? 'bg-purple-400/15 border-purple-400 text-purple-300 shadow-sm'
                    : 'bg-[#0e0e12] border-[#252530] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Soft Blur
              </button>
            </div>
          </div>

          {/* Intensity Slider */}
          <div className="space-y-2 pt-2 border-t border-[#23232c]">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Blur Strength</span>
              <span className="font-mono font-bold text-purple-400">{blurIntensity}px</span>
            </div>
            <input
              type="range"
              min="6"
              max="40"
              value={blurIntensity}
              onChange={(e) => setBlurIntensity(Number(e.target.value))}
              className="w-full accent-purple-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Region Action Tools */}
          <div className="space-y-2 pt-2 border-t border-[#23232c]">
            <label className="text-xs font-semibold text-zinc-300">Region Actions</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={!selectedAsset}
                onClick={() => handleAddDefaultRegion(selectedAsset)}
                className="flex items-center justify-center gap-1 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                title="Add center box"
              >
                <Plus className="w-3.5 h-3.5 text-lime-400" />
                <span>Add Box</span>
              </button>

              <button
                type="button"
                disabled={regions.length === 0}
                onClick={handleUndo}
                className="flex items-center justify-center gap-1 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-40"
                title="Undo last box"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>

              <button
                type="button"
                disabled={regions.length === 0}
                onClick={handleClearAll}
                className="flex items-center justify-center gap-1 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors disabled:opacity-40"
                title="Clear all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Process Button */}
          <button
            disabled={!selectedAsset || regions.length === 0 || processing}
            onClick={() => handleExport(selectedAsset)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-black" />
                <span>Applying Concealment...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black" />
                <span>Apply Blur & Export</span>
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
              variantType="blurred"
              metadata={{
                blurStyle,
                blurIntensity,
                regionsCount: regions.length,
              }}
              onClose={() => setResult(null)}
            />
          )}
        </div>
      )}
    </ToolLayout>
  );
};
