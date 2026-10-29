import React, { useEffect, useState, useRef } from 'react';
import {
  History,
  GitBranch,
  RotateCcw,
  Download,
  Columns,
} from 'lucide-react';
import { ImageAsset } from '@/types';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { useAssetStore } from '@/stores/assetStore';
import { formatBytes } from '@/utils/cn';
import { toast } from 'sonner';

interface VersionHistoryPanelProps {
  currentAsset: ImageAsset;
  onSelectAsset?: (asset: ImageAsset) => void;
  onClose?: () => void;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  currentAsset,
  onSelectAsset,
}) => {
  const [history, setHistory] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersionA, setSelectedVersionA] = useState<ImageAsset>(currentAsset);
  const [selectedVersionB, setSelectedVersionB] = useState<ImageAsset | null>(null);
  const [compareMode, setCompareMode] = useState<'split' | 'side-by-side'>('split');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [urlA, setUrlA] = useState<string | null>(null);
  const [urlB, setUrlB] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef(false);
  const { fetchAssets } = useAssetStore();

  const loadHistory = async () => {
    setLoading(true);
    try {
      const records = await assetService.getAssetHistory(currentAsset.id);
      setHistory(records);
      const active = records.find((r) => r.id === currentAsset.id) || records[records.length - 1] || currentAsset;
      setSelectedVersionA(active);
      if (records.length > 1) {
        // Default comparison version: root original or first version
        const other = records.find((r) => r.id !== active.id) || records[0];
        setSelectedVersionB(other);
      }
    } catch {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [currentAsset.id]);

  // Load image blob URLs for selected versions
  useEffect(() => {
    let active = true;
    let objA: string | null = null;
    let objB: string | null = null;

    if (selectedVersionA) {
      assetService.getAssetBlob(selectedVersionA.id).then((b) => {
        if (active && b) {
          objA = URL.createObjectURL(b);
          setUrlA(objA);
        }
      });
    }

    if (selectedVersionB) {
      assetService.getAssetBlob(selectedVersionB.id).then((b) => {
        if (active && b) {
          objB = URL.createObjectURL(b);
          setUrlB(objB);
        }
      });
    }

    return () => {
      active = false;
      if (objA) URL.revokeObjectURL(objA);
      if (objB) URL.revokeObjectURL(objB);
    };
  }, [selectedVersionA?.id, selectedVersionB?.id]);

  const handleSliderMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPosition(percent);
  };

  const handleMouseDown = () => {
    isDraggingSlider.current = true;
  };

  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingSlider.current = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider.current) {
        handleSliderMove(e.clientX);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider.current && e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const handleRestore = async (version: ImageAsset) => {
    setRestoring(true);
    try {
      const restored = await assetService.restoreAssetVersion(version.id);
      await fetchAssets();
      toast.success(`Restored to Version ${version.version ?? 1}! Saved as new head.`);
      await loadHistory();
      if (onSelectAsset) {
        onSelectAsset(restored);
      }
    } catch {
      toast.error('Failed to restore image version');
    } finally {
      setRestoring(false);
    }
  };

  const handleDownload = (asset: ImageAsset) => {
    downloadService.downloadAsset(asset.id);
  };

  const sizeDiff = selectedVersionB
    ? selectedVersionA.currentSize - selectedVersionB.currentSize
    : 0;

  return (
    <div className="flex flex-col h-full bg-[#101014] text-zinc-200 select-none">
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#20202a] bg-[#141419]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-lime-400" />
          <h3 className="font-semibold text-xs tracking-wide text-zinc-100 uppercase">
            Transformation Lineage & History
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
            {history.length} versions
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedVersionB && (
            <div className="flex items-center bg-[#0d0d10] p-0.5 rounded-lg border border-[#22222a]">
              <button
                onClick={() => setCompareMode('split')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  compareMode === 'split' ? 'bg-zinc-800 text-lime-400 shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Split Slider
              </button>
              <button
                onClick={() => setCompareMode('side-by-side')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  compareMode === 'side-by-side' ? 'bg-zinc-800 text-lime-400 shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Columns className="w-3 h-3" />
                Side by Side
              </button>
            </div>
          )}

          <button
            onClick={() => handleRestore(selectedVersionA)}
            disabled={restoring}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-black font-semibold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Restore this version as newest library asset"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${restoring ? 'animate-spin' : ''}`} />
            <span>Restore Version</span>
          </button>
        </div>
      </div>

      {/* Main Content: Split into Visual Comparison Area & Lineage Timeline */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Viewport: Interactive Comparison */}
        <div className="flex-1 flex flex-col bg-[#0a0a0c] relative overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
              <span className="animate-pulse">Loading version nodes...</span>
            </div>
          ) : compareMode === 'split' && selectedVersionB && urlA && urlB ? (
            <div
              ref={containerRef}
              className="relative w-full h-full flex items-center justify-center p-4 cursor-ew-resize overflow-hidden"
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            >
              {/* Version B (Background / Reference) */}
              <div className="absolute inset-4 flex items-center justify-center">
                <img
                  src={urlB}
                  alt={selectedVersionB.filename}
                  className="max-w-full max-h-full object-contain pointer-events-none rounded-lg"
                />
              </div>

              {/* Version A (Foreground, Clipped by Slider) */}
              <div
                className="absolute inset-4 flex items-center justify-center overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={urlA}
                  alt={selectedVersionA.filename}
                  className="max-w-full max-h-full object-contain pointer-events-none rounded-lg"
                />
              </div>

              {/* Divider Line */}
              <div
                className="absolute top-4 bottom-4 w-0.5 bg-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.8)] pointer-events-none z-20"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-black border-2 border-lime-400 flex items-center justify-center shadow-lg text-lime-400">
                  <Columns className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>

              {/* Badges Overlay */}
              <div className="absolute top-6 left-6 z-10 px-2.5 py-1 rounded bg-black/80 backdrop-blur border border-zinc-800 text-[11px] text-lime-400 font-mono">
                v{selectedVersionA.version ?? 1} (Left)
              </div>
              <div className="absolute top-6 right-6 z-10 px-2.5 py-1 rounded bg-black/80 backdrop-blur border border-zinc-800 text-[11px] text-cyan-400 font-mono">
                v{selectedVersionB.version ?? 1} (Right)
              </div>
            </div>
          ) : compareMode === 'side-by-side' && selectedVersionB && urlA && urlB ? (
            <div className="flex-1 grid grid-cols-2 gap-3 p-4 overflow-hidden">
              <div className="flex flex-col bg-[#121216] rounded-xl border border-[#22222c] overflow-hidden p-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[11px]">
                  <span className="font-semibold text-lime-400 font-mono">
                    Version {selectedVersionA.version ?? 1}
                  </span>
                  <span className="text-zinc-400">
                    {selectedVersionA.width}×{selectedVersionA.height}px · {formatBytes(selectedVersionA.currentSize)}
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center pt-2 overflow-hidden">
                  <img
                    src={urlA}
                    alt={selectedVersionA.filename}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              </div>

              <div className="flex flex-col bg-[#121216] rounded-xl border border-[#22222c] overflow-hidden p-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[11px]">
                  <span className="font-semibold text-cyan-400 font-mono">
                    Version {selectedVersionB.version ?? 1}
                  </span>
                  <span className="text-zinc-400">
                    {selectedVersionB.width}×{selectedVersionB.height}px · {formatBytes(selectedVersionB.currentSize)}
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center pt-2 overflow-hidden">
                  <img
                    src={urlB}
                    alt={selectedVersionB.filename}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              </div>
            </div>
          ) : urlA ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <img
                src={urlA}
                alt={selectedVersionA.filename}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          ) : null}

          {/* Bottom Diff Metrics Bar */}
          {selectedVersionB && (
            <div className="h-12 border-t border-[#1e1e28] bg-[#121216]/90 backdrop-blur px-4 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-4 text-zinc-400">
                <span>
                  Size Diff:{' '}
                  <span className={sizeDiff <= 0 ? 'text-lime-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {sizeDiff <= 0 ? '-' : '+'}{formatBytes(Math.abs(sizeDiff))}
                  </span>
                </span>
                <span>
                  Dims: {selectedVersionA.width}×{selectedVersionA.height} vs {selectedVersionB.width}×{selectedVersionB.height}
                </span>
              </div>
              <div className="text-[11px] text-zinc-500">
                Drag slider to inspect pixels
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Timeline Lineage */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[#20202a] bg-[#131317] flex flex-col h-72 md:h-full">
          <div className="p-3 border-b border-[#20202a] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
              Transformation Tree
            </span>
            <span className="text-[10px] text-zinc-500">Click to compare</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {history.map((item, index) => {
              const isSelectedA = item.id === selectedVersionA.id;
              const isSelectedB = item.id === selectedVersionB?.id;
              const isRoot = index === 0;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    isSelectedA
                      ? 'bg-lime-400/10 border-lime-400/60 shadow-[0_0_15px_rgba(163,230,53,0.1)]'
                      : isSelectedB
                      ? 'bg-cyan-400/10 border-cyan-400/60'
                      : 'bg-[#18181f] border-[#262634] hover:border-zinc-700'
                  }`}
                  onClick={() => {
                    if (selectedVersionA.id !== item.id) {
                      setSelectedVersionB(selectedVersionA);
                      setSelectedVersionA(item);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isRoot ? 'bg-zinc-800 text-zinc-300' : 'bg-lime-400/20 text-lime-400'
                      }`}>
                        v{item.version ?? (index + 1)}
                      </span>
                      <span className="font-medium text-xs text-zinc-200 truncate max-w-[130px]">
                        {isRoot ? 'Original Master' : item.variantType ? item.variantType.toUpperCase() : 'Derived'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isSelectedA && (
                        <span className="text-[10px] bg-lime-400 text-black px-1.5 py-0.2 rounded font-bold">
                          Active
                        </span>
                      )}
                      {isSelectedB && !isSelectedA && (
                        <span className="text-[10px] bg-cyan-400 text-black px-1.5 py-0.2 rounded font-bold">
                          Compare
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Operation Note */}
                  <p className="text-[11px] text-zinc-400 mt-1.5 leading-snug">
                    {item.operationNote || (isRoot ? 'Imported source image' : `Processed with ${item.variantType}`)}
                  </p>

                  {/* Metadata Specs */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-2 pt-2 border-t border-zinc-800/60">
                    <span>{item.width}×{item.height}px</span>
                    <span>{formatBytes(item.currentSize)}</span>
                    <span className="uppercase">{item.mimeType.replace('image/', '')}</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(item);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      title="Download this version"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(item);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-medium transition-colors"
                      title="Restore as newest"
                    >
                      <RotateCcw className="w-3 h-3 text-lime-400" />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
