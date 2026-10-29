import React, { useState } from 'react';
import { RefreshCw, Play, Sparkles, FolderOpen, Download, FolderPlus, CheckCircle2, Layers } from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import { ProcessingResultPanel } from '@/components/common/ProcessingResultPanel';
import { AssetPickerDialog } from '@/components/image-picker/AssetPickerDialog';
import { canvasProcessor } from '@/services/image-processing/canvasProcessor';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { zipSync } from 'fflate';
import { ImageAsset } from '@/types';
import { formatBytes } from '@/utils/cn';
import { toast } from 'sonner';

export const ConverterPage: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [targetFormat, setTargetFormat] = useState<'image/webp' | 'image/jpeg' | 'image/png'>('image/webp');
  const [quality, setQuality] = useState<number>(85);

  // Batch Mode States
  const [batchAssets, setBatchAssets] = useState<ImageAsset[]>([]);
  const [batchPickerOpen, setBatchPickerOpen] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
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

  const handleSingleProcess = async (asset: ImageAsset | null, blob: Blob | null) => {
    if (!asset || !blob) {
      toast.error('Please select an image first');
      return;
    }

    setSingleProcessing(true);
    try {
      const output = await canvasProcessor.convertFormat(blob, targetFormat, quality / 100);
      setSingleResult(output);
      toast.success('Conversion complete');
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
    const convertedItems: { asset: ImageAsset; newBlob: Blob }[] = [];

    for (let i = 0; i < batchAssets.length; i++) {
      const asset = batchAssets[i];
      try {
        const rawBlob = await assetService.getAssetBlob(asset.id);
        if (rawBlob) {
          const out = await canvasProcessor.convertFormat(rawBlob, targetFormat, quality / 100);
          convertedItems.push({ asset, newBlob: out.blob });
        }
      } catch (err) {
        console.error(`Failed to convert ${asset.filename}`, err);
      }
    }

    setBatchCompleted(convertedItems);
    setBatchProcessing(false);
    toast.success(`Converted ${convertedItems.length} images to ${targetFormat.replace('image/', '').toUpperCase()}`);
  };

  const handleDownloadBatchZip = async () => {
    if (batchCompleted.length === 0) return;
    try {
      const ext = targetFormat === 'image/jpeg' ? '.jpg' : targetFormat === 'image/webp' ? '.webp' : '.png';
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
      const zipBlob = new Blob([zipped as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
      downloadService.downloadBlob(zipBlob, `converted-batch-${Date.now()}.zip`);
      toast.success('Downloaded converted images ZIP');
    } catch {
      toast.error('Failed to create ZIP');
    }
  };

  const handleSaveBatchToLibrary = async () => {
    let count = 0;
    for (const item of batchCompleted) {
      await assetService.saveProcessedImage(
        item.asset.id,
        item.newBlob,
        'converted',
        { format: targetFormat }
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
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#121217] border border-[#23232c] max-w-sm">
        <button
          onClick={() => setMode('single')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'single'
              ? 'bg-zinc-800 text-lime-400 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Single Image
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'batch'
              ? 'bg-zinc-800 text-lime-400 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Batch Converter
        </button>
      </div>

      {mode === 'single' ? (
        <ToolLayout
          title="Format Converter"
          description="Convert images between WebP, PNG, and JPEG formats directly in your browser."
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
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-3 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono">
                  <span className="text-zinc-400">Current: {selectedAsset.mimeType.replace('image/', '').toUpperCase()}</span>
                  <span className="text-lime-400 font-bold">Target: {targetFormat.replace('image/', '').toUpperCase()}</span>
                </div>
              </div>
            );
          }}
        >
          {(selectedAsset, blob) => (
            <div className="space-y-5 p-5 rounded-2xl bg-[#141419] border border-[#23232c] shadow-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Target Output Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['image/webp', 'image/jpeg', 'image/png'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setTargetFormat(fmt)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase border transition-all ${
                        targetFormat === fmt
                          ? 'bg-lime-400/15 border-lime-400 text-lime-400 shadow-sm'
                          : 'bg-[#0e0e12] border-[#252530] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {fmt.replace('image/', '')}
                    </button>
                  ))}
                </div>
              </div>

              {targetFormat !== 'image/png' && (
                <div className="space-y-2 pt-2 border-t border-[#23232c]">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Output Encoding Quality</span>
                    <span className="font-mono font-bold text-lime-400">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-lime-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              <button
                disabled={!selectedAsset || singleProcessing}
                onClick={() => handleSingleProcess(selectedAsset, blob)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {singleProcessing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-black" />
                    <span>Converting Format...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black" />
                    <span>Convert Image</span>
                  </>
                )}
              </button>

              {singleResult && (
                <ProcessingResultPanel
                  sourceAsset={selectedAsset}
                  resultBlob={singleResult.blob}
                  outputWidth={singleResult.width}
                  outputHeight={singleResult.height}
                  variantType="converted"
                  metadata={{ targetFormat, quality }}
                  onClose={() => setSingleResult(null)}
                />
              )}
            </div>
          )}
        </ToolLayout>
      ) : (
        /* Batch Converter Workspace */
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#141419] border border-[#23232c] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#23232c]">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Batch Image Converter
                </h3>
                <p className="text-xs text-zinc-400">
                  Select multiple library images, convert them simultaneously, and download as a ZIP archive.
                </p>
              </div>

              <button
                onClick={() => setBatchPickerOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Select Images ({batchAssets.length})</span>
              </button>
            </div>

            {/* Target Format selector */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300">Convert All To:</span>
                <div className="flex gap-1.5">
                  {(['image/webp', 'image/jpeg', 'image/png'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setTargetFormat(fmt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase border transition-all ${
                        targetFormat === fmt
                          ? 'bg-lime-400/15 border-lime-400 text-lime-400'
                          : 'bg-[#0e0e12] border-[#252530] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {fmt.replace('image/', '')}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={batchAssets.length === 0 || batchProcessing}
                onClick={handleBatchProcess}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-bold transition-all disabled:opacity-40"
              >
                {batchProcessing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-black" />
                    <span>Converting Queue...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black" />
                    <span>Run Batch Conversion</span>
                  </>
                )}
              </button>
            </div>

            {/* Selected Queue Table */}
            {batchAssets.length > 0 && (
              <div className="rounded-xl border border-[#22222a] bg-[#0e0e12] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#22222a] bg-[#121217] text-[11px] font-semibold text-zinc-400 uppercase">
                      <th className="p-3">File Name</th>
                      <th className="p-3">Source Format</th>
                      <th className="p-3">Dimensions</th>
                      <th className="p-3">Size</th>
                      <th className="p-3 text-right">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchAssets.map((asset) => (
                      <tr key={asset.id} className="border-b border-[#1c1c24] text-zinc-300">
                        <td className="p-3 font-medium text-zinc-200">{asset.filename}</td>
                        <td className="p-3 font-mono uppercase text-zinc-500">{asset.mimeType.replace('image/', '')}</td>
                        <td className="p-3 font-mono text-zinc-400">{asset.width} × {asset.height}</td>
                        <td className="p-3 font-mono text-zinc-400">{formatBytes(asset.currentSize)}</td>
                        <td className="p-3 text-right font-mono uppercase font-bold text-lime-400">
                          {targetFormat.replace('image/', '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Batch Completed Summary & Export */}
            {batchCompleted.length > 0 && (
              <div className="p-4 rounded-xl bg-lime-400/5 border border-lime-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-lime-400" />
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">
                      {batchCompleted.length} Images Converted Successfully
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Ready to download as a zipped package or save back into your library.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadBatchZip}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-bold transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download ZIP</span>
                  </button>

                  <button
                    onClick={handleSaveBatchToLibrary}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all"
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
            }}
          />
        </div>
      )}
    </div>
  );
};
