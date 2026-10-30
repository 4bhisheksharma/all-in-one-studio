import React, { useState, useMemo } from 'react';
import {
  Grid,
  Download,
  FolderPlus,
  Play,
  Sparkles,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import { splitterService, SplitOptions, SliceResult } from '@/services/image-processing/splitterService';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { ImageAsset } from '@/types';
import { formatBytes } from '@/utils/cn';
import { toast } from 'sonner';

export const SplitterPage: React.FC = () => {
  const [mode, setMode] = useState<'carousel' | 'grid'>('carousel');
  const [slides, setSlides] = useState<number>(3);
  const [rows, setRows] = useState<number>(3);
  const [cols, setCols] = useState<number>(3);
  const [numbering, setNumbering] = useState<'standard' | 'instagram-feed'>('standard');
  const [format, setFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');

  const [processing, setProcessing] = useState(false);
  const [slices, setSlices] = useState<SliceResult[]>([]);
  const [savingLibrary, setSavingLibrary] = useState(false);

  const splitOptions: SplitOptions = useMemo(
    () => ({
      mode,
      slides,
      rows,
      cols,
      numbering,
      format,
    }),
    [mode, slides, rows, cols, numbering, format]
  );

  const handleProcess = async (asset: ImageAsset | null, blob: Blob | null) => {
    if (!asset || !blob) {
      toast.error('Please select an image first');
      return;
    }

    setProcessing(true);
    try {
      const results = await splitterService.splitImage(blob, asset.filename, splitOptions);
      setSlices(results);
      toast.success(`Successfully split into ${results.length} pieces!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to split image');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (slices.length === 0) return;
    try {
      const zipBlob = await splitterService.createSlicesZip(slices);
      downloadService.downloadBlob(zipBlob, `image-slices-${Date.now()}.zip`);
      toast.success('Downloaded slices ZIP archive');
    } catch {
      toast.error('Failed to create ZIP');
    }
  };

  const handleSaveToLibrary = async (sourceAsset: ImageAsset) => {
    if (slices.length === 0) return;
    setSavingLibrary(true);
    try {
      for (const slice of slices) {
        await assetService.saveProcessedImage(
          sourceAsset.id,
          slice.blob,
          'cropped',
          {
            splitMode: mode,
            sliceIndex: slice.index,
            totalSlices: slices.length,
          },
          sourceAsset.projectId,
          slice.filename,
          `Split ${slice.label} (${slice.width}×${slice.height}px)`
        );
      }
      toast.success(`Saved ${slices.length} slices to library!`);
    } catch {
      toast.error('Failed to save slices to library');
    } finally {
      setSavingLibrary(false);
    }
  };

  return (
    <div className="space-y-6">
      <ToolLayout
        title="Image Splitter & Slicer"
        description="Slice panoramic graphics into seamless multi-part social carousels or grid tiles with automated numbering."
        icon={Grid}
        onClear={() => setSlices([])}
        previewContent={(selectedAsset, blob) => {
          if (!selectedAsset || !blob) return null;

          const bounds = splitterService.calculateSliceBounds(
            selectedAsset.width,
            selectedAsset.height,
            splitOptions
          );

          return (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 select-none relative">
              <div className="relative max-h-[460px] max-w-full flex items-center justify-center rounded-xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800">
                <img
                  src={URL.createObjectURL(blob)}
                  alt="Source preview"
                  className="max-h-[440px] max-w-full object-contain block"
                />

                {/* Slicing Grid Overlay Lines & Badges */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${selectedAsset.width} ${selectedAsset.height}`}
                  preserveAspectRatio="none"
                >
                  {bounds.map((b) => (
                    <g key={b.index}>
                      <rect
                        x={b.x}
                        y={b.y}
                        width={b.width}
                        height={b.height}
                        fill="rgba(0, 0, 0, 0.04)"
                        stroke="rgba(255, 255, 255, 0.85)"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                    </g>
                  ))}
                </svg>

                {/* Overlay Numbering Pills */}
                <div className="absolute inset-0 pointer-events-none">
                  {bounds.map((b) => {
                    const leftPct = ((b.x + b.width / 2) / selectedAsset.width) * 100;
                    const topPct = ((b.y + b.height / 2) / selectedAsset.height) * 100;

                    return (
                      <div
                        key={b.index}
                        style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-zinc-900/90 text-white dark:bg-white/90 dark:text-zinc-900 font-mono text-[11px] font-bold shadow-md backdrop-blur-sm border border-white/20 dark:border-black/20"
                      >
                        #{b.index}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dimension Callout */}
              <div className="mt-3 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                {selectedAsset.width} × {selectedAsset.height} px source · {bounds.length} target slices
              </div>
            </div>
          );
        }}
      >
        {(selectedAsset, blob) => (
          <div className="space-y-5 p-5 rounded-2xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 shadow-sm">
            {/* Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Slicing Strategy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('carousel')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'carousel'
                      ? 'bg-zinc-100 dark:bg-zinc-800/90 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'bg-zinc-50/60 dark:bg-[#141418] border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <span className="font-semibold text-xs flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5" />
                    Seamless Carousel
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Split panoramic images into continuous sliding cards for Instagram/LinkedIn.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('grid')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'grid'
                      ? 'bg-zinc-100 dark:bg-zinc-800/90 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'bg-zinc-50/60 dark:bg-[#141418] border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <span className="font-semibold text-xs flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5" />
                    Grid Tiles
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Divide images into equal rows and columns (e.g. 3×3 profile feed banners).
                  </span>
                </button>
              </div>
            </div>

            {/* Mode-Specific Controls */}
            {mode === 'carousel' ? (
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Number of Carousel Slides
                  </label>
                  <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {slides} Slides
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSlides(num)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        slides === num
                          ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                          : 'bg-zinc-50 dark:bg-[#141418] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {num} Slides
                    </button>
                  ))}
                </div>

                {selectedAsset && (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#121217] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">Output Dimensions: </span>
                    Each slide will be approximately{' '}
                    <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {Math.round(selectedAsset.width / slides)} × {selectedAsset.height} px
                    </span>
                    .
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Grid Presets
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: '3 × 3 (9-Tile)', r: 3, c: 3 },
                      { label: '3 × 2 (6-Tile)', r: 2, c: 3 },
                      { label: '3 × 1 (Banner)', r: 1, c: 3 },
                      { label: '2 × 2 (Square)', r: 2, c: 2 },
                    ].map((p) => {
                      const active = rows === p.r && cols === p.c;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            setRows(p.r);
                            setCols(p.c);
                          }}
                          className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                            active
                              ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-xs'
                              : 'bg-zinc-50 dark:bg-[#141418] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Rows</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={rows}
                      onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Columns</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={cols}
                      onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 font-mono"
                    />
                  </div>
                </div>

                {/* Numbering Sequence */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs text-zinc-600 dark:text-zinc-400">Numbering Order</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNumbering('standard')}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        numbering === 'standard'
                          ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-800 dark:border-zinc-200 text-zinc-900 dark:text-zinc-100 font-medium'
                          : 'bg-zinc-50 dark:bg-[#141418] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Standard (1 → {rows * cols})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNumbering('instagram-feed')}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        numbering === 'instagram-feed'
                          ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-800 dark:border-zinc-200 text-zinc-900 dark:text-zinc-100 font-medium'
                          : 'bg-zinc-50 dark:bg-[#141418] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Instagram ({rows * cols} → 1 reverse)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Output Format */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Export Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['image/png', 'image/webp', 'image/jpeg'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium uppercase border transition-all cursor-pointer ${
                      format === fmt
                        ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 font-semibold'
                        : 'bg-zinc-50 dark:bg-[#141418] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {fmt.replace('image/', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Run Split Button */}
            <button
              disabled={!selectedAsset || processing}
              onClick={() => handleProcess(selectedAsset, blob)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer"
            >
              {processing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-white dark:text-zinc-900" />
                  <span>Slicing Image Segments...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Generate {mode === 'carousel' ? `${slides} Carousel Slides` : `${rows * cols} Grid Tiles`}</span>
                </>
              )}
            </button>
          </div>
        )}
      </ToolLayout>

      {/* Slices Results Gallery */}
      {slices.length > 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {slices.length} Slices Generated
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Download all pieces in sequenced numerical order as a ZIP archive or save to library.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleDownloadZip}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download All (ZIP)</span>
              </button>

              <button
                disabled={savingLibrary}
                onClick={() => {
                  const asset = slices[0] ? { id: slices[0].id, filename: slices[0].filename, projectId: null } as any : null;
                  if (asset) handleSaveToLibrary(asset);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-all border border-zinc-200 dark:border-zinc-700 cursor-pointer disabled:opacity-50"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Save All to Library</span>
              </button>
            </div>
          </div>

          {/* Grid of Slices */}
          <div className={`grid gap-3 ${
            mode === 'carousel'
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3'
          }`}>
            {slices.map((slice) => (
              <div
                key={slice.id}
                className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#121217] space-y-2 flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    #{slice.index}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {formatBytes(slice.blob.size)}
                  </span>
                </div>

                <div className="aspect-square w-full rounded-lg overflow-hidden bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center p-1">
                  <img
                    src={slice.dataUrl}
                    alt={slice.label}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between gap-1 text-[11px]">
                  <span className="text-zinc-500 font-mono text-[10px] truncate">
                    {slice.width}×{slice.height}px
                  </span>

                  <button
                    onClick={() => downloadService.downloadBlob(slice.blob, slice.filename)}
                    title={`Download ${slice.filename}`}
                    className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
