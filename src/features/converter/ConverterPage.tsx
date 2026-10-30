import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Play,
  Sparkles,
  FolderOpen,
  Download,
  FolderPlus,
  CheckCircle2,
  Layers,
  FileText,
  Sliders,
  Check,
} from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import { ProcessingResultPanel } from '@/components/common/ProcessingResultPanel';
import { AssetPickerDialog } from '@/components/image-picker/AssetPickerDialog';
import { canvasProcessor } from '@/services/image-processing/canvasProcessor';
import {
  SUPPORTED_TARGET_FORMATS,
  FormatOption,
  checkAvifSupport,
  encodeMultiPagePdf,
} from '@/services/image-processing/formatEncoders';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { zipSync } from 'fflate';
import { ImageAsset } from '@/types';
import { formatBytes } from '@/utils/cn';
import { toast } from 'sonner';

export const ConverterPage: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('webp');
  const [quality, setQuality] = useState<number>(85);
  const [avifSupported, setAvifSupported] = useState<boolean>(true);

  // Batch Mode States
  const [batchAssets, setBatchAssets] = useState<ImageAsset[]>([]);
  const [batchPickerOpen, setBatchPickerOpen] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [mergeMultiPagePdf, setMergeMultiPagePdf] = useState<boolean>(true);
  const [mergedPdfBlob, setMergedPdfBlob] = useState<Blob | null>(null);
  const [batchCompleted, setBatchCompleted] = useState<{
    asset: ImageAsset;
    newBlob: Blob;
  }[]>([]);

  // Single Mode Result
  const [singleResult, setSingleResult] = useState<{
    blob: Blob;
    width: number;
    height: number;
  } | null>(null);
  const [singleProcessing, setSingleProcessing] = useState(false);

  useEffect(() => {
    checkAvifSupport().then((supported) => setAvifSupported(supported));
  }, []);

  const activeFormat: FormatOption =
    SUPPORTED_TARGET_FORMATS.find((f) => f.id === selectedFormatId) ||
    SUPPORTED_TARGET_FORMATS[0];

  const handleFormatChange = (format: FormatOption) => {
    setSelectedFormatId(format.id);
    if (format.defaultQuality) {
      setQuality(format.defaultQuality);
    }
  };

  const handleSingleProcess = async (asset: ImageAsset | null, blob: Blob | null) => {
    if (!asset || !blob) {
      toast.error('Please select an image first');
      return;
    }

    setSingleProcessing(true);
    try {
      const output = await canvasProcessor.convertFormat(
        blob,
        activeFormat.mimeType,
        quality / 100
      );
      setSingleResult(output);
      toast.success(`Converted to ${activeFormat.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setSingleProcessing(false);
    }
  };

  const handleBatchProcess = async () => {
    if (batchAssets.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setBatchProcessing(true);
    setMergedPdfBlob(null);

    try {
      // Special case: Batch PDF merged into one multi-page document
      if (activeFormat.id === 'pdf' && mergeMultiPagePdf) {
        const rawBlobs: Blob[] = [];
        for (const asset of batchAssets) {
          const rawBlob = await assetService.getAssetBlob(asset.id);
          if (rawBlob) rawBlobs.push(rawBlob);
        }

        const pdfRes = await encodeMultiPagePdf(rawBlobs, quality / 100);
        setMergedPdfBlob(pdfRes.blob);
        setBatchProcessing(false);
        toast.success(`Compiled ${pdfRes.pageCount}-page PDF document!`);
        return;
      }

      // Individual conversions
      const convertedItems: { asset: ImageAsset; newBlob: Blob }[] = [];

      for (let i = 0; i < batchAssets.length; i++) {
        const asset = batchAssets[i];
        try {
          const rawBlob = await assetService.getAssetBlob(asset.id);
          if (rawBlob) {
            const out = await canvasProcessor.convertFormat(
              rawBlob,
              activeFormat.mimeType,
              quality / 100
            );
            convertedItems.push({ asset, newBlob: out.blob });
          }
        } catch (err) {
          console.error(`Failed to convert ${asset.filename}`, err);
        }
      }

      setBatchCompleted(convertedItems);
      toast.success(
        `Converted ${convertedItems.length} images to ${activeFormat.label}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Batch processing failed');
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleDownloadBatchZip = async () => {
    if (batchCompleted.length === 0) return;
    try {
      const ext = activeFormat.extension;
      const files = batchCompleted.map((item) => ({
        blob: item.newBlob,
        filename: `${item.asset.filename.replace(/\.[^/.]+$/, '')}-converted${ext}`,
      }));

      // Bundle into ZIP using fflate
      const zipData: Record<string, Uint8Array> = {};
      for (const f of files) {
        const buf = await f.blob.arrayBuffer();
        zipData[f.filename] = new Uint8Array(buf);
      }

      const zipped = zipSync(zipData);
      const zipBlob = new Blob([zipped as Uint8Array<ArrayBuffer>], {
        type: 'application/zip',
      });
      downloadService.downloadBlob(
        zipBlob,
        `converted-${activeFormat.id}-batch-${Date.now()}.zip`
      );
      toast.success('Downloaded converted images ZIP');
    } catch {
      toast.error('Failed to create ZIP package');
    }
  };

  const handleDownloadMergedPdf = () => {
    if (!mergedPdfBlob) return;
    downloadService.downloadBlob(
      mergedPdfBlob,
      `compiled-document-${Date.now()}.pdf`
    );
    toast.success('Downloaded multi-page PDF document');
  };

  const handleSaveBatchToLibrary = async () => {
    let count = 0;
    for (const item of batchCompleted) {
      await assetService.saveProcessedImage(
        item.asset.id,
        item.newBlob,
        'converted',
        { format: activeFormat.mimeType }
      );
      count++;
    }
    toast.success(`Saved ${count} converted assets to library`);
    setBatchCompleted([]);
    setBatchAssets([]);
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-[#121217] border border-zinc-200 dark:border-zinc-800 max-w-sm">
        <button
          onClick={() => setMode('single')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === 'single'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Single Image
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === 'batch'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Batch Converter
        </button>
      </div>

      {mode === 'single' ? (
        <ToolLayout
          title="Format Converter"
          description="Transform images across WebP, AVIF, PNG, JPEG, multi-size ICO Favicons, PDF documents, and BMP formats 100% in your browser."
          icon={RefreshCw}
          onClear={() => setSingleResult(null)}
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
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-900/90 dark:bg-black/80 backdrop-blur-md border border-zinc-700/50 dark:border-white/10 text-xs font-mono">
                  <span className="text-zinc-400">
                    Source: {selectedAsset.mimeType.replace('image/', '').toUpperCase()}
                  </span>
                  <span className="text-zinc-100 font-semibold flex items-center gap-1.5">
                    Target: {activeFormat.label} ({activeFormat.extension})
                  </span>
                </div>
              </div>
            );
          }}
        >
          {(selectedAsset, blob) => (
            <div className="space-y-5 p-5 rounded-2xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 shadow-sm">
              {/* Format Selection Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Target Output Format
                  </label>
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    {SUPPORTED_TARGET_FORMATS.length} formats available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUPPORTED_TARGET_FORMATS.map((fmt) => {
                    const isSelected = selectedFormatId === fmt.id;
                    const isAvifFallback = fmt.id === 'avif' && !avifSupported;

                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => handleFormatChange(fmt)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-zinc-100 dark:bg-zinc-800/90 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 shadow-xs'
                            : 'bg-zinc-50/60 dark:bg-[#141418] border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-semibold text-xs tracking-tight">
                            {fmt.label}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold'
                                : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {fmt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {isAvifFallback
                            ? 'Browser direct export unavailable; will encode high-efficiency WebP.'
                            : fmt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format-Specific Feature Callout */}
              {activeFormat.id === 'ico' && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#121217] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                    Multi-Resolution Favicon Bundle
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Automatically generates 16×16, 32×32, 48×48, and 64×64 PNG layers into a single `.ico` file, compatible with all browser tabs, bookmarks, and desktop systems.
                  </p>
                </div>
              )}

              {activeFormat.id === 'pdf' && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#121217] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                    Standard PDF 1.4 Document
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Embeds the image at full source pixel dimensions into a standard PDF page with zero external library overhead.
                  </p>
                </div>
              )}

              {/* Quality Slider for formats that support compression */}
              {activeFormat.supportsQuality && (
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      Output Encoding Quality
                    </span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {quality}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-zinc-900 dark:accent-zinc-100 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Process Button */}
              <button
                disabled={!selectedAsset || singleProcessing}
                onClick={() => handleSingleProcess(selectedAsset, blob)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {singleProcessing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-white dark:text-zinc-900" />
                    <span>Converting to {activeFormat.label}...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Convert to {activeFormat.label}</span>
                  </>
                )}
              </button>

              {/* Result Panel */}
              {singleResult && (
                <ProcessingResultPanel
                  sourceAsset={selectedAsset}
                  resultBlob={singleResult.blob}
                  outputWidth={singleResult.width}
                  outputHeight={singleResult.height}
                  variantType="converted"
                  metadata={{
                    targetFormat: activeFormat.mimeType,
                    quality: activeFormat.supportsQuality ? quality : undefined,
                  }}
                  onClose={() => setSingleResult(null)}
                />
              )}
            </div>
          )}
        </ToolLayout>
      ) : (
        /* Batch Converter Workspace */
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 space-y-6 shadow-sm">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  Batch Image Converter
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select multiple library images, convert them simultaneously across next-gen formats, and package into a ZIP or single multi-page PDF.
                </p>
              </div>

              <button
                onClick={() => setBatchPickerOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium shadow-sm transition-all self-start sm:self-auto cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Select Images ({batchAssets.length})</span>
              </button>
            </div>

            {/* Target Format Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Select Output Format For All Images
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {SUPPORTED_TARGET_FORMATS.map((fmt) => {
                  const isSelected = selectedFormatId === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => handleFormatChange(fmt)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 ${
                        isSelected
                          ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-sm font-semibold'
                          : 'bg-zinc-50 dark:bg-[#141418] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-xs font-bold">{fmt.label}</span>
                      <span className="text-[10px] opacity-75 font-mono">{fmt.extension}</span>
                    </button>
                  );
                })}
              </div>

              {/* Special Batch Options for PDF */}
              {activeFormat.id === 'pdf' && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-[#121217] border border-zinc-200 dark:border-zinc-800 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-800 dark:text-zinc-200 font-medium">
                    <input
                      type="checkbox"
                      checked={mergeMultiPagePdf}
                      onChange={(e) => setMergeMultiPagePdf(e.target.checked)}
                      className="accent-zinc-900 dark:accent-zinc-100 rounded"
                    />
                    <span>Compile all images into a single Multi-Page PDF document</span>
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    ({mergeMultiPagePdf ? '1 merged .pdf file' : 'individual .pdf files in .zip'})
                  </span>
                </div>
              )}

              {/* Batch Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-zinc-500 font-mono">
                  {batchAssets.length} image{batchAssets.length === 1 ? '' : 's'} queued
                </span>

                <button
                  disabled={batchAssets.length === 0 || batchProcessing}
                  onClick={handleBatchProcess}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer"
                >
                  {batchProcessing ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-white dark:text-zinc-900" />
                      <span>Converting {batchAssets.length} Images...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Run Batch Conversion</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Selected Queue Table */}
            {batchAssets.length > 0 && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0e0e12] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-[#121217] text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
                      <th className="p-3">File Name</th>
                      <th className="p-3">Source Format</th>
                      <th className="p-3">Dimensions</th>
                      <th className="p-3">Size</th>
                      <th className="p-3 text-right">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchAssets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="border-b border-zinc-100 dark:border-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      >
                        <td className="p-3 font-medium text-zinc-900 dark:text-zinc-200">
                          {asset.filename}
                        </td>
                        <td className="p-3 font-mono uppercase text-zinc-500">
                          {asset.mimeType.replace('image/', '')}
                        </td>
                        <td className="p-3 font-mono text-zinc-500 dark:text-zinc-400">
                          {asset.width} × {asset.height}
                        </td>
                        <td className="p-3 font-mono text-zinc-500 dark:text-zinc-400">
                          {formatBytes(asset.currentSize)}
                        </td>
                        <td className="p-3 text-right font-mono uppercase font-semibold text-zinc-900 dark:text-zinc-100">
                          {activeFormat.label}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Merged PDF Result Download Card */}
            {mergedPdfBlob && (
              <div className="p-4 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Multi-Page PDF Compiled Successfully
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Document compiled ({formatBytes(mergedPdfBlob.size)}) with all {batchAssets.length} image pages.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadMergedPdf}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Multi-Page PDF</span>
                </button>
              </div>
            )}

            {/* Batch Completed Summary & Export */}
            {batchCompleted.length > 0 && (
              <div className="p-4 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {batchCompleted.length} Images Converted Successfully
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Ready to download as a zipped package or save back into your library.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadBatchZip}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download ZIP ({activeFormat.extension})</span>
                  </button>

                  <button
                    onClick={handleSaveBatchToLibrary}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-all border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Save All to Library</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Batch Asset Picker Modal */}
          <AssetPickerDialog
            open={batchPickerOpen}
            onClose={() => setBatchPickerOpen(false)}
            multiSelect
            title="Select Images for Batch Conversion"
            description="Pick multiple images from your library or project to convert together."
            onSelect={(selected) => {
              setBatchAssets(selected);
              setBatchCompleted([]);
              setMergedPdfBlob(null);
            }}
          />
        </div>
      )}
    </div>
  );
};
