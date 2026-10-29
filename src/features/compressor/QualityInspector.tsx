import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Columns,
  SplitSquareVertical,
  Activity,
  Flame,
  Info,
} from 'lucide-react';
import { ImageAsset } from '@/types';
import { canvasProcessor, ProcessedOutput } from '@/services/image-processing/canvasProcessor';
import { formatBytes } from '@/utils/cn';

interface QualityInspectorProps {
  originalBlob: Blob;
  sourceAsset: ImageAsset | null;
  format: 'image/webp' | 'image/jpeg' | 'image/png';
  quality: number; // 5 to 100
  mode: 'quality' | 'target';
  targetKB: number;
  onQualityChange?: (newQuality: number) => void;
  onFormatChange?: (newFormat: 'image/webp' | 'image/jpeg' | 'image/png') => void;
  onProcessedUpdate?: (output: ProcessedOutput | null) => void;
}

type ViewMode = 'split' | 'sideBySide' | 'heatmap';

export const QualityInspector: React.FC<QualityInspectorProps> = ({
  originalBlob,
  sourceAsset,
  format,
  quality,
  mode,
  targetKB,
  onQualityChange,
  onFormatChange,
  onProcessedUpdate,
}) => {
  // URLs
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [processedUrl, setProcessedUrl] = useState<string>('');
  const [processedOutput, setProcessedOutput] = useState<ProcessedOutput | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Inspector View Modes: 'split' | 'sideBySide' | 'heatmap'
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  // Split Divider Position (0 to 100%)
  const [splitPos, setSplitPos] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);

  // Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 100, 200, 400, 800%
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Heatmap Canvas Reference
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Quality Ladder Comparison Presets
  const [ladderData, setLadderData] = useState<
    { quality: number; label: string; size: number; savings: number }[]
  >([]);

  // Stable Original Object URL
  useEffect(() => {
    const url = URL.createObjectURL(originalBlob);
    setOriginalUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [originalBlob]);

  // Live Compression Debounced Execution
  useEffect(() => {
    let active = true;
    setIsProcessing(true);

    const timer = setTimeout(async () => {
      try {
        let output: ProcessedOutput;
        if (mode === 'target' && (format === 'image/jpeg' || format === 'image/webp')) {
          output = await canvasProcessor.approximateTargetSize(originalBlob, targetKB, format);
        } else {
          output = await canvasProcessor.compressImage(originalBlob, format, quality / 100);
        }

        if (active) {
          setProcessedOutput(output);
          if (onProcessedUpdate) onProcessedUpdate(output);

          const url = URL.createObjectURL(output.blob);
          setProcessedUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setIsProcessing(false);
        }
      } catch {
        if (active) setIsProcessing(false);
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [originalBlob, format, quality, mode, targetKB, onProcessedUpdate]);

  // Compute Quality Ladder Presets (50%, 70%, 85%, 95%) in background
  useEffect(() => {
    if (format === 'image/png') {
      setLadderData([]);
      return;
    }

    let active = true;
    const presets = [
      { quality: 50, label: 'Low / Compact' },
      { quality: 70, label: 'Balanced' },
      { quality: 85, label: 'Recommended' },
      { quality: 95, label: 'High Fidelity' },
    ];

    const generateLadder = async () => {
      const results = [];
      const origSize = originalBlob.size;

      for (const p of presets) {
        try {
          const res = await canvasProcessor.compressImage(originalBlob, format, p.quality / 100);
          const savings = origSize > 0 ? Math.round(((origSize - res.blob.size) / origSize) * 100) : 0;
          results.push({
            quality: p.quality,
            label: p.label,
            size: res.blob.size,
            savings,
          });
        } catch {
          // ignore individual preset failure
        }
      }

      if (active) {
        setLadderData(results);
      }
    };

    generateLadder();

    return () => {
      active = false;
    };
  }, [originalBlob, format]);

  // Compute Artifact Heatmap when in heatmap mode
  useEffect(() => {
    if (viewMode !== 'heatmap' || !originalUrl || !processedUrl) return;

    let active = true;
    const computeHeatmap = async () => {
      try {
        const [img1, img2] = await Promise.all([
          canvasProcessor.loadImage(originalBlob),
          processedOutput ? canvasProcessor.loadImage(processedOutput.blob) : null,
        ]);

        if (!active || !img2 || !heatmapCanvasRef.current) return;

        const w = img1.naturalWidth;
        const h = img1.naturalHeight;

        const c1 = document.createElement('canvas');
        c1.width = w;
        c1.height = h;
        const ctx1 = c1.getContext('2d');
        if (!ctx1) return;
        ctx1.drawImage(img1, 0, 0);
        const d1 = ctx1.getImageData(0, 0, w, h).data;

        const c2 = document.createElement('canvas');
        c2.width = w;
        c2.height = h;
        const ctx2 = c2.getContext('2d');
        if (!ctx2) return;
        ctx2.drawImage(img2, 0, 0);
        const d2 = ctx2.getImageData(0, 0, w, h).data;

        const outCanvas = heatmapCanvasRef.current;
        outCanvas.width = w;
        outCanvas.height = h;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) return;

        const outImgData = outCtx.createImageData(w, h);
        const out = outImgData.data;

        const totalPixels = w * h;
        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;
          const diffR = Math.abs(d1[idx] - d2[idx]);
          const diffG = Math.abs(d1[idx + 1] - d2[idx + 1]);
          const diffB = Math.abs(d1[idx + 2] - d2[idx + 2]);
          const maxDiff = Math.max(diffR, diffG, diffB);

          if (maxDiff === 0) {
            out[idx] = 18;
            out[idx + 1] = 18;
            out[idx + 2] = 22;
            out[idx + 3] = 255;
          } else {
            // Amplify compression delta with gradient from green to yellow to neon red
            const amp = Math.min(255, maxDiff * 6);
            out[idx] = amp > 128 ? 255 : amp * 2; // R
            out[idx + 1] = amp < 128 ? 255 : Math.max(0, 255 - (amp - 128) * 2); // G
            out[idx + 2] = 30; // B
            out[idx + 3] = 255; // A
          }
        }

        outCtx.putImageData(outImgData, 0, 0);
      } catch {
        // heatmap error fallback
      }
    };

    computeHeatmap();

    return () => {
      active = false;
    };
  }, [viewMode, originalBlob, originalUrl, processedUrl, processedOutput]);

  // Split Divider Mouse Handling
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDraggingSplit && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const pct = Math.max(5, Math.min(95, (clientX / rect.width) * 100));
        setSplitPos(pct);
      }

      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [isDraggingSplit, isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingSplit(false);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (isDraggingSplit || isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingSplit, isPanning, handleMouseMove, handleMouseUp]);

  // Pan interaction on viewport
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 100 && !isDraggingSplit) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Reset Zoom & Pan
  const handleResetZoom = () => {
    setZoomLevel(100);
    setPan({ x: 0, y: 0 });
  };

  // Metrics & Stats
  const originalSize = originalBlob.size;
  const processedSize = processedOutput ? processedOutput.blob.size : 0;
  const savingsPercent =
    originalSize > 0 && processedSize > 0
      ? Math.round(((originalSize - processedSize) / originalSize) * 100)
      : 0;

  // Warnings
  const isLossyAlphaWarning = useMemo(() => {
    const isPng = sourceAsset?.mimeType === 'image/png' || originalBlob.type === 'image/png';
    return isPng && format === 'image/jpeg';
  }, [sourceAsset, originalBlob, format]);

  const isAggressiveQualityWarning = useMemo(() => {
    return mode === 'quality' && quality < 45 && format !== 'image/png';
  }, [mode, quality, format]);

  return (
    <div className="w-full h-full flex flex-col justify-between select-none overflow-hidden relative">
      {/* Top Inspector Bar */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 z-30 text-xs">
        {/* Comparison View Mode Toggles */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'split'
                ? 'bg-lime-400 text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Interactive Split Slider"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Split Slider</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('sideBySide')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'sideBySide'
                ? 'bg-lime-400 text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Side-by-Side Dual View"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('heatmap')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'heatmap'
                ? 'bg-lime-400 text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Artifact Heatmap (Difference Delta)"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Artifact Heatmap</span>
          </button>
        </div>

        {/* Zoom & Magnification Controls (100% to 800% for pixel artifact inspection) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-zinc-400">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(100, z / 2))}
              className="p-1 hover:text-zinc-200"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {[100, 200, 400, 800].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  setZoomLevel(level);
                  if (level === 100) setPan({ x: 0, y: 0 });
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                  zoomLevel === level ? 'bg-zinc-800 text-lime-400' : 'hover:text-zinc-200'
                }`}
              >
                {level}%
              </button>
            ))}

            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(800, z * 2))}
              className="p-1 hover:text-zinc-200"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 hover:text-zinc-200 border-l border-zinc-800 ml-1"
              title="Reset 1:1 view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Viewport Container */}
      <div
        ref={containerRef}
        onMouseDown={handleViewportMouseDown}
        style={{
          cursor: zoomLevel > 100 ? (isPanning ? 'grabbing' : 'grab') : 'default',
        }}
        className="flex-1 w-full overflow-hidden relative flex items-center justify-center p-4 bg-[radial-gradient(#1c1c24_1px,transparent_1px)] bg-[size:16px_16px] bg-[#0c0c10]"
      >
        {/* Loading Spinner Indicator */}
        {isProcessing && (
          <div className="absolute top-4 right-4 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur border border-lime-400/40 text-[10px] text-lime-400 font-semibold shadow-lg">
            <Sparkles className="w-3 h-3 animate-spin" />
            <span>Analyzing quality...</span>
          </div>
        )}

        {/* View Mode 1: Interactive Split Slider (Before | After) */}
        {viewMode === 'split' && originalUrl && (
          <div
            className="relative max-h-[520px] max-w-full inline-block overflow-hidden rounded-xl border border-zinc-800 shadow-2xl transition-transform duration-75"
            style={{
              transform: `scale(${zoomLevel / 100}) translate(${pan.x / (zoomLevel / 100)}px, ${pan.y / (zoomLevel / 100)}px)`,
              transformOrigin: 'center center',
            }}
          >
            {/* Background Layer: Processed / Compressed Image */}
            <img
              src={processedUrl || originalUrl}
              alt="Compressed"
              className="max-h-[500px] max-w-full object-contain block pointer-events-none"
            />

            {/* Foreground Layer (Clipped): Original Image */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${splitPos}%` }}
            >
              <img
                src={originalUrl}
                alt="Original"
                className="max-h-[500px] max-w-none object-contain block"
                style={{
                  width: containerRef.current?.querySelector('img')?.clientWidth || 'auto',
                  height: containerRef.current?.querySelector('img')?.clientHeight || 'auto',
                }}
              />
            </div>

            {/* Draggable Split Divider Line & Handle */}
            <div
              onMouseDown={handleSplitMouseDown}
              className="absolute inset-y-0 w-1 bg-lime-400 cursor-ew-resize z-20 shadow-[0_0_10px_rgba(163,230,53,0.8)]"
              style={{ left: `${splitPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-8 h-8 rounded-full bg-lime-400 border-2 border-black flex items-center justify-center text-black shadow-lg cursor-ew-resize hover:scale-110 transition-transform">
                <Columns className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Badges on Viewport */}
            <div className="absolute top-3 left-3 pointer-events-none z-10 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur border border-white/10 text-[10px] font-mono text-zinc-300">
              ORIGINAL ({formatBytes(originalSize)})
            </div>
            <div className="absolute top-3 right-3 pointer-events-none z-10 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur border border-white/10 text-[10px] font-mono text-lime-400 font-bold">
              COMPRESSED ({processedSize > 0 ? formatBytes(processedSize) : '...'})
            </div>
          </div>
        )}

        {/* View Mode 2: Side-by-Side Dual View */}
        {viewMode === 'sideBySide' && originalUrl && (
          <div
            className="grid grid-cols-2 gap-4 max-w-full max-h-[520px] transition-transform duration-75"
            style={{
              transform: `scale(${zoomLevel / 100}) translate(${pan.x / (zoomLevel / 100)}px, ${pan.y / (zoomLevel / 100)}px)`,
              transformOrigin: 'center center',
            }}
          >
            {/* Left: Original */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 relative">
              <img
                src={originalUrl}
                alt="Original"
                className="max-h-[460px] max-w-full object-contain rounded-lg"
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-300">
                Original ({formatBytes(originalSize)})
              </div>
            </div>

            {/* Right: Compressed */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 relative">
              <img
                src={processedUrl || originalUrl}
                alt="Compressed"
                className="max-h-[460px] max-w-full object-contain rounded-lg"
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-lime-400 font-bold">
                Compressed ({processedSize > 0 ? formatBytes(processedSize) : '...'})
              </div>
            </div>
          </div>
        )}

        {/* View Mode 3: Artifact Heatmap (Difference Delta) */}
        {viewMode === 'heatmap' && (
          <div
            className="relative max-h-[520px] max-w-full inline-block overflow-hidden rounded-xl border border-zinc-800 shadow-2xl transition-transform duration-75"
            style={{
              transform: `scale(${zoomLevel / 100}) translate(${pan.x / (zoomLevel / 100)}px, ${pan.y / (zoomLevel / 100)}px)`,
              transformOrigin: 'center center',
            }}
          >
            <canvas ref={heatmapCanvasRef} className="max-h-[500px] max-w-full object-contain block" />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/80 text-[10px] text-zinc-300 font-mono flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span>Amplified Artifact Difference Map</span>
            </div>
          </div>
        )}
      </div>

      {/* Warnings Banner (Lost Transparency or Extreme Artifacts) */}
      {(isLossyAlphaWarning || isAggressiveQualityWarning) && (
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center gap-3">
          {isLossyAlphaWarning && (
            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Lost Transparency Warning:</strong> JPEG discards alpha channels. Transparent areas will become white matte.
              </span>
              {onFormatChange && (
                <button
                  type="button"
                  onClick={() => onFormatChange('image/webp')}
                  className="ml-2 underline font-semibold text-amber-200 hover:text-white"
                >
                  Switch to WebP
                </button>
              )}
            </div>
          )}

          {isAggressiveQualityWarning && !isLossyAlphaWarning && (
            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
              <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>High Artifact Risk:</strong> Quality is below 45%. Fine lines, gradients, and text may show noticeable blocking and ringing.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Quality Ladder & Metrics Comparison Bar */}
      <div className="px-4 py-3 bg-[#111116] border-t border-zinc-800 flex flex-col gap-2.5 z-20">
        {/* Multi-Quality Comparison Ladder (Lets user compare 4 presets before saving) */}
        {ladderData.length > 0 && format !== 'image/png' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="font-semibold flex items-center gap-1 text-zinc-300">
                <Sliders className="w-3.5 h-3.5 text-lime-400" />
                Compare Quality Settings Before Saving
              </span>
              <span>Click any preset to apply</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ladderData.map((item) => {
                const isSelected = mode === 'quality' && quality === item.quality;
                return (
                  <button
                    key={item.quality}
                    type="button"
                    onClick={() => onQualityChange && onQualityChange(item.quality)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-lime-400/15 border-lime-400 text-lime-300 shadow-sm'
                        : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{item.quality}% Quality</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                      <span className="text-zinc-400">{formatBytes(item.size)}</span>
                      <span className={item.savings > 0 ? 'text-lime-400 font-semibold' : 'text-zinc-500'}>
                        {item.savings > 0 ? `-${item.savings}%` : '0%'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Technical Specs Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-xs">
          <div className="flex items-center gap-4 text-zinc-400">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-zinc-500" />
              <span>Dimensions: <strong className="font-mono text-zinc-200">{sourceAsset?.width || processedOutput?.width} × {sourceAsset?.height || processedOutput?.height} px</strong></span>
            </span>
            <span>•</span>
            <span>Format: <strong className="font-mono text-zinc-200 uppercase">{format.replace('image/', '')}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-zinc-400 font-mono">
              {formatBytes(originalSize)} → <strong className="text-lime-400 font-bold">{processedSize > 0 ? formatBytes(processedSize) : '...'}</strong>
            </span>
            {savingsPercent > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-400 font-mono font-bold text-[11px]">
                -{savingsPercent}% Saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
