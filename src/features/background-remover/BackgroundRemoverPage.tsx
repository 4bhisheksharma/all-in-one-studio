import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Play,
  Sliders,
  ShieldCheck,
  Paintbrush,
  Pipette,
  Image as ImageIcon,
  Eraser,
  Undo2,
  Check,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import { ProcessingResultPanel } from '@/components/common/ProcessingResultPanel';
import { AssetPickerDialog } from '@/components/image-picker/AssetPickerDialog';
import { ImageAsset } from '@/types';
import { assetService } from '@/services/storage/assetService';
import { toast } from 'sonner';

type BgMode = 'transparent' | 'color' | 'image' | 'blur';
type ToolMode = 'smart' | 'chroma' | 'brush';
type BrushAction = 'erase' | 'restore';

export const BackgroundRemoverPage: React.FC = () => {
  // Segmentation Settings
  const [toolMode, setToolMode] = useState<ToolMode>('smart');
  const [tolerance, setTolerance] = useState<number>(32); // 0-100
  const [feather, setFeather] = useState<number>(2); // 0-10px
  const [keyColor, setKeyColor] = useState<{ r: number; g: number; b: number }>({ r: 255, g: 255, b: 255 });

  // Brush settings
  const [brushAction, setBrushAction] = useState<BrushAction>('erase');
  const [brushSize, setBrushSize] = useState<number>(28);
  const [isBrushing, setIsBrushing] = useState(false);

  // Background Replacement Settings
  const [bgMode, setBgMode] = useState<BgMode>('transparent');
  const [solidColor, setSolidColor] = useState<string>('#ffffff');
  const [bgAsset, setBgAsset] = useState<ImageAsset | null>(null);
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);

  // Preview & Viewport State
  const [processing, setProcessing] = useState(false);
  const [maskData, setMaskData] = useState<Uint8Array | null>(null);
  const [maskHistory, setMaskHistory] = useState<Uint8Array[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [result, setResult] = useState<{
    blob: Blob;
    width: number;
    height: number;
  } | null>(null);

  // References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const loadedBlobUrlRef = useRef<string | null>(null);
  // Current selected asset
  const [currentAsset, setCurrentAsset] = useState<ImageAsset | null>(null);

  const resetAll = () => {
    setMaskData(null);
    setMaskHistory([]);
    setResult(null);
    setBgAsset(null);
    setBgImageObj(null);
    originalImgRef.current = null;
    if (loadedBlobUrlRef.current) {
      URL.revokeObjectURL(loadedBlobUrlRef.current);
      loadedBlobUrlRef.current = null;
    }
  };

  const handleAssetLoaded = (asset: ImageAsset | null) => {
    setCurrentAsset(asset);
    resetAll();
  };

  // Build the initial mask using smart edge/color heuristics
  const generateInitialMask = useCallback((img: HTMLImageElement, tol: number): Uint8Array => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const totalPixels = w * h;
    const mask = new Uint8Array(totalPixels);

    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const offCtx = off.getContext('2d', { willReadFrequently: true });
    if (!offCtx) {
      mask.fill(255);
      return mask;
    }

    offCtx.drawImage(img, 0, 0);
    const imgData = offCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    if (toolMode === 'chroma') {
      const kr = keyColor.r;
      const kg = keyColor.g;
      const kb = keyColor.b;
      const distThreshold = tol * 2.5;

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);
        mask[i] = dist < distThreshold ? 0 : 255;
      }
      return mask;
    }

    // Smart Mode: Sample corners & boundary frame
    const samplePoints: { r: number; g: number; b: number }[] = [];
    const cornerOffsets = [
      0,
      (w - 1) * 4,
      (h - 1) * w * 4,
      ((h - 1) * w + (w - 1)) * 4,
      Math.floor(w / 2) * 4,
      ((h - 1) * w + Math.floor(w / 2)) * 4,
    ];

    for (const offset of cornerOffsets) {
      samplePoints.push({
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2],
      });
    }

    const avgR = samplePoints.reduce((acc, p) => acc + p.r, 0) / samplePoints.length;
    const avgG = samplePoints.reduce((acc, p) => acc + p.g, 0) / samplePoints.length;
    const avgB = samplePoints.reduce((acc, p) => acc + p.b, 0) / samplePoints.length;

    const thresholdDist = Math.max(20, tol * 2.8);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const distAvg = Math.sqrt((r - avgR) ** 2 + (g - avgG) ** 2 + (b - avgB) ** 2);
      let isCornerClose = distAvg < thresholdDist;
      if (!isCornerClose) {
        for (const sp of samplePoints) {
          const d = Math.sqrt((r - sp.r) ** 2 + (g - sp.g) ** 2 + (b - sp.b) ** 2);
          if (d < thresholdDist * 0.75) {
            isCornerClose = true;
            break;
          }
        }
      }

      mask[i] = isCornerClose ? 0 : 255;
    }

    return mask;
  }, [toolMode, keyColor]);

  // Handle setting background replacement asset
  const handleSelectBgAsset = async (asset: ImageAsset) => {
    setBgAsset(asset);
    const blob = await assetService.getAssetBlob(asset.id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        setBgImageObj(img);
        setBgMode('image');
      };
      img.src = url;
    }
  };

  // Render composite to canvas
  const renderComposite = useCallback(() => {
    const canvas = canvasRef.current;
    const img = originalImgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentMask = maskData;
    if (!currentMask) {
      currentMask = generateInitialMask(img, tolerance);
      setMaskData(currentMask);
    }

    // 1. Draw background
    if (bgMode === 'transparent') {
      ctx.clearRect(0, 0, w, h);
    } else if (bgMode === 'color') {
      ctx.fillStyle = solidColor;
      ctx.fillRect(0, 0, w, h);
    } else if (bgMode === 'blur') {
      ctx.save();
      ctx.filter = 'blur(20px)';
      ctx.drawImage(img, -20, -20, w + 40, h + 40);
      ctx.restore();
    } else if (bgMode === 'image' && bgImageObj) {
      const bgW = bgImageObj.naturalWidth;
      const bgH = bgImageObj.naturalHeight;
      const scale = Math.max(w / bgW, h / bgH);
      const sw = bgW * scale;
      const sh = bgH * scale;
      const sx = (w - sw) / 2;
      const sy = (h - sh) / 2;
      ctx.drawImage(bgImageObj, sx, sy, sw, sh);
    }

    // 2. Prepare foreground cutout with alpha mask
    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = w;
    fgCanvas.height = h;
    const fgCtx = fgCanvas.getContext('2d');
    if (!fgCtx) return;

    fgCtx.drawImage(img, 0, 0);
    const fgImgData = fgCtx.getImageData(0, 0, w, h);
    const fgBytes = fgImgData.data;

    const total = w * h;
    for (let i = 0; i < total; i++) {
      const alpha = currentMask[i];
      if (alpha === 0) {
        fgBytes[i * 4 + 3] = 0;
      } else if (alpha < 255) {
        fgBytes[i * 4 + 3] = Math.round((fgBytes[i * 4 + 3] * alpha) / 255);
      }
    }

    fgCtx.putImageData(fgImgData, 0, 0);

    // 3. Edge feathering
    if (feather > 0) {
      ctx.save();
      ctx.filter = `blur(${feather * 0.4}px)`;
      ctx.drawImage(fgCanvas, 0, 0);
      ctx.restore();
    }

    // 4. Draw final isolated subject
    ctx.drawImage(fgCanvas, 0, 0);
  }, [maskData, bgMode, solidColor, bgImageObj, feather, generateInitialMask, tolerance]);

  useEffect(() => {
    renderComposite();
  }, [renderComposite]);

  const handleRecalculate = () => {
    if (!originalImgRef.current) return;
    const newMask = generateInitialMask(originalImgRef.current, tolerance);
    if (maskData) {
      setMaskHistory((prev) => [...prev.slice(-4), maskData]);
    }
    setMaskData(newMask);
    toast.success('Segmentation updated');
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = originalImgRef.current;
    if (!canvas || !img) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (toolMode === 'chroma') {
      const off = document.createElement('canvas');
      off.width = canvas.width;
      off.height = canvas.height;
      const offCtx = off.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(img, 0, 0);
        const pixel = offCtx.getImageData(x, y, 1, 1).data;
        setKeyColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
        toast.success(`Keyed color sample: RGB(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`);
        const newMask = generateInitialMask(img, tolerance);
        setMaskData(newMask);
      }
      return;
    }

    if (toolMode === 'brush') {
      setIsBrushing(true);
      applyBrush(x, y);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isBrushing || toolMode !== 'brush') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    applyBrush(x, y);
  };

  const handleCanvasMouseUp = () => {
    if (isBrushing) {
      setIsBrushing(false);
    }
  };

  const applyBrush = (cx: number, cy: number) => {
    if (!maskData || !canvasRef.current) return;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const newMask = new Uint8Array(maskData);

    const r = brushSize;
    const r2 = r * r;
    const minX = Math.max(0, cx - r);
    const maxX = Math.min(w - 1, cx + r);
    const minY = Math.max(0, cy - r);
    const maxY = Math.min(h - 1, cy + r);

    const targetVal = brushAction === 'erase' ? 0 : 255;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (dist2 <= r2) {
          const idx = y * w + x;
          newMask[idx] = targetVal;
        }
      }
    }

    setMaskData(newMask);
  };

  const handleUndo = () => {
    if (maskHistory.length === 0) return;
    const previous = maskHistory[maskHistory.length - 1];
    setMaskData(previous);
    setMaskHistory((prev) => prev.slice(0, -1));
    toast.info('Reverted to previous mask');
  };

  const handleApply = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setProcessing(true);
    try {
      const mime = bgMode === 'transparent' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setResult({
              blob,
              width: canvas.width,
              height: canvas.height,
            });
            toast.success('Subject cutout generated!');
          } else {
            toast.error('Failed to export image.');
          }
          setProcessing(false);
        },
        mime,
        0.95
      );
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
      setProcessing(false);
    }
  };

  const solidColorPresets = [
    { label: 'Clean White', color: '#ffffff' },
    { label: 'Deep Black', color: '#000000' },
    { label: 'Studio Grey', color: '#27272a' },
    { label: 'Vibrant Lime', color: '#a3e635' },
    { label: 'Sky Blue', color: '#38bdf8' },
    { label: 'Soft Peach', color: '#fed7aa' },
  ];

  return (
    <>
      <ToolLayout
        title="Background Remover"
        description="Local on-device subject segmentation with transparent cutout, solid colors, and library backdrop replacement."
        icon={Sparkles}
        onClear={resetAll}
        onAssetChange={handleAssetLoaded}
        previewContent={(selectedAsset, originalBlob) => {
          if (!selectedAsset || !originalBlob) return null;

          // Load original image reference if not yet loaded
          if (!originalImgRef.current && originalBlob) {
            const url = URL.createObjectURL(originalBlob);
            loadedBlobUrlRef.current = url;
            const img = new Image();
            img.onload = () => {
              originalImgRef.current = img;
              renderComposite();
            };
            img.src = url;
          }

          return (
            <div className="w-full h-full flex flex-col justify-between items-center relative overflow-hidden select-none">
              {/* Top Viewport Toolbar */}
              <div className="w-full flex items-center justify-between px-4 py-2 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 z-10 text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Layers className="w-3.5 h-3.5 text-lime-400" />
                  <span>
                    Canvas: <span className="font-mono text-zinc-200">{selectedAsset.width} × {selectedAsset.height} px</span>
                  </span>
                  <span>•</span>
                  <span className="capitalize text-zinc-300">Mode: {toolMode}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] text-zinc-400 min-w-10 text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(100)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    title="Reset Zoom"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Viewport Canvas Container */}
              <div className="flex-1 w-full flex items-center justify-center p-4 overflow-auto">
                <div
                  className="relative rounded-lg shadow-2xl overflow-hidden border border-zinc-700/50 bg-[linear-gradient(45deg,#1f1f28_25%,transparent_25%),linear-gradient(-45deg,#1f1f28_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1f1f28_75%),linear-gradient(-45deg,transparent_75%,#1f1f28_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] bg-[#141419]"
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease-out',
                    cursor: toolMode === 'chroma' ? 'crosshair' : toolMode === 'brush' ? 'cell' : 'default',
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className="max-h-[500px] max-w-full object-contain block"
                  />
                </div>
              </div>

              {/* Floating Helper Tip */}
              <div className="py-1.5 px-3 rounded-full bg-black/70 backdrop-blur-md border border-zinc-800 text-[11px] text-zinc-400 mb-2">
                {toolMode === 'chroma' && 'Click any background pixel to sample key color'}
                {toolMode === 'brush' && `${brushAction === 'erase' ? 'Erasing' : 'Restoring'} with radius ${brushSize}px. Drag mouse over canvas.`}
                {toolMode === 'smart' && 'Smart auto-segmentation active. Adjust tolerance or feathering in sidebar.'}
              </div>
            </div>
          );
        }}
      >
        {(selectedAsset) => (
          <div className="space-y-6">
            {/* On-device Privacy Assurance */}
            <div className="p-3.5 rounded-xl bg-lime-400/5 border border-lime-400/20 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-lime-400 block">100% Client-Side Privacy</span>
                <span className="text-zinc-400 leading-relaxed">
                  Image matting and subject isolation run entirely inside your browser. No files are uploaded to any external server.
                </span>
              </div>
            </div>

            {/* Segmentation Engine Mode */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Segmentation Method
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setToolMode('smart')}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                    toolMode === 'smart'
                      ? 'bg-lime-400 text-black shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 mb-1" />
                  <span>Smart Auto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setToolMode('chroma')}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                    toolMode === 'chroma'
                      ? 'bg-lime-400 text-black shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Pipette className="w-4 h-4 mb-1" />
                  <span>Color Key</span>
                </button>
                <button
                  type="button"
                  onClick={() => setToolMode('brush')}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                    toolMode === 'brush'
                      ? 'bg-lime-400 text-black shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Paintbrush className="w-4 h-4 mb-1" />
                  <span>Brush Polish</span>
                </button>
              </div>
            </div>

            {/* Chroma Color Picker Indicator if in chroma mode */}
            {toolMode === 'chroma' && (
              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Sampled Key Color:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-zinc-700 shadow-sm"
                      style={{ backgroundColor: `rgb(${keyColor.r}, ${keyColor.g}, ${keyColor.b})` }}
                    />
                    <span className="text-zinc-200 font-mono text-[11px]">
                      rgb({keyColor.r}, {keyColor.g}, {keyColor.b})
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Tip: Click anywhere on the image preview to sample the backdrop color to remove.
                </p>
              </div>
            )}

            {/* Brush Controls if in brush mode */}
            {toolMode === 'brush' && (
              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBrushAction('erase')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                      brushAction === 'erase'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400 font-semibold'
                        : 'bg-zinc-800 border-transparent text-zinc-400'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Erase Area</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrushAction('restore')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                      brushAction === 'restore'
                        ? 'bg-lime-400/10 border-lime-400/30 text-lime-400 font-semibold'
                        : 'bg-zinc-800 border-transparent text-zinc-400'
                    }`}
                  >
                    <Paintbrush className="w-3.5 h-3.5" />
                    <span>Restore Area</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Brush Radius</span>
                    <span className="text-zinc-200 font-mono">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="80"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full accent-lime-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                </div>

                {maskHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="w-full py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Undo Last Brush Stroke</span>
                  </button>
                )}
              </div>
            )}

            {/* Threshold & Sensitivity Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-zinc-300">Tolerance / Sensitivity</span>
                <span className="font-mono text-zinc-400">{tolerance}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="85"
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="w-full accent-lime-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>Tight Edge</span>
                <span>Broad Match</span>
              </div>
            </div>

            {/* Feather / Edge Softness */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-zinc-300">Edge Feathering</span>
                <span className="font-mono text-zinc-400">{feather}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={feather}
                onChange={(e) => setFeather(Number(e.target.value))}
                className="w-full accent-lime-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>

            <button
              type="button"
              onClick={handleRecalculate}
              className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-zinc-700"
            >
              <Sliders className="w-3.5 h-3.5 text-lime-400" />
              <span>Re-calculate Matte</span>
            </button>

            {/* Background Replacement Options */}
            <div className="space-y-3 pt-3 border-t border-zinc-800">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                Replace Background With
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBgMode('transparent')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    bgMode === 'transparent'
                      ? 'bg-lime-400/10 border-lime-400/40 text-lime-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md border border-zinc-700 bg-[linear-gradient(45deg,#222_25%,transparent_25%),linear-gradient(-45deg,#222_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#222_75%),linear-gradient(-45deg,transparent_75%,#222_75%)] bg-[size:8px_8px] bg-[position:0_0,0_4px,4px_-4px,-4px_0]" />
                  <span className="text-xs font-semibold text-zinc-200">Transparent</span>
                  <span className="text-[10px] text-zinc-500">Pure PNG Cutout</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBgMode('color')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    bgMode === 'color'
                      ? 'bg-lime-400/10 border-lime-400/40 text-lime-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-md border border-zinc-700"
                    style={{ backgroundColor: solidColor }}
                  />
                  <span className="text-xs font-semibold text-zinc-200">Solid Color</span>
                  <span className="text-[10px] text-zinc-500">Clean Backdrop</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBgMode('blur')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    bgMode === 'blur'
                      ? 'bg-lime-400/10 border-lime-400/40 text-lime-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md border border-zinc-700 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-60 filter blur-[1px]" />
                  <span className="text-xs font-semibold text-zinc-200">Bokeh Blur</span>
                  <span className="text-[10px] text-zinc-500">Defocus Original</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBgPickerOpen(true);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    bgMode === 'image'
                      ? 'bg-lime-400/10 border-lime-400/40 text-lime-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200">
                    {bgAsset ? 'Backdrop Set' : 'Library Photo'}
                  </span>
                  <span className="text-[10px] text-zinc-500">Select Image</span>
                </button>
              </div>

              {/* Color Presets */}
              {bgMode === 'color' && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {solidColorPresets.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => setSolidColor(preset.color)}
                        title={preset.label}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-transform ${
                          solidColor === preset.color
                            ? 'scale-110 border-lime-400 ring-2 ring-lime-400/30'
                            : 'border-zinc-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.color }}
                      >
                        {solidColor === preset.color && (
                          <Check
                            className={`w-3.5 h-3.5 ${
                              preset.color === '#ffffff' || preset.color === '#fed7aa'
                                ? 'text-black'
                                : 'text-white'
                            }`}
                          />
                        )}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={solidColor}
                      onChange={(e) => setSolidColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border border-zinc-700 bg-transparent cursor-pointer p-0"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Apply Action Button */}
            <button
              onClick={handleApply}
              disabled={processing || !selectedAsset}
              className="w-full py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-lime-400/10 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>{processing ? 'Processing Cutout...' : 'Export Cutout'}</span>
            </button>
          </div>
        )}
      </ToolLayout>

      {/* Backdrop Asset Picker Modal */}
      <AssetPickerDialog
        open={bgPickerOpen}
        onClose={() => setBgPickerOpen(false)}
        onSelect={(assets) => {
          if (assets.length > 0) {
            handleSelectBgAsset(assets[0]);
          }
          setBgPickerOpen(false);
        }}
        title="Select Background Replacement"
        description="Choose a scene or texture from your workspace library to place behind your subject."
      />

      {/* Result Comparison & Lineage Modal */}
      {result && (
        <ProcessingResultPanel
          sourceAsset={currentAsset}
          resultBlob={result.blob}
          outputWidth={result.width}
          outputHeight={result.height}
          variantType="bg-removed"
          metadata={{
            bgMode,
            tolerance,
            feather,
          }}
          onClose={() => setResult(null)}
        />
      )}
    </>
  );
};
