import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  FolderPlus,
  BookmarkCheck,
  ArrowRight,
  X,
  Minimize2,
  Maximize2,
  Crop,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageAsset, VariantType } from '@/types';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { useProjectStore } from '@/stores/projectStore';
import { useAssetStore } from '@/stores/assetStore';
import { formatBytes } from '@/utils/cn';

interface ProcessingResultPanelProps {
  sourceAsset: ImageAsset | null;
  resultBlob: Blob;
  outputWidth: number;
  outputHeight: number;
  variantType: VariantType;
  metadata?: Record<string, unknown>;
  operationNote?: string;
  toolId?: string;
  onClose: () => void;
  onSaved?: (newAsset: ImageAsset) => void;
}

export const ProcessingResultPanel: React.FC<ProcessingResultPanelProps> = ({
  sourceAsset,
  resultBlob,
  outputWidth,
  outputHeight,
  variantType,
  metadata = {},
  operationNote,
  toolId,
  onClose,
  onSaved,
}) => {
  const navigate = useNavigate();
  const { projects } = useProjectStore();
  const { fetchAssets } = useAssetStore();

  const [resultUrl, setResultUrl] = useState<string>('');
  const [targetProjectId, setTargetProjectId] = useState<string>(sourceAsset?.projectId || '');
  const [saving, setSaving] = useState(false);
  const [savedAsset, setSavedAsset] = useState<ImageAsset | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(resultBlob);
    setResultUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [resultBlob]);

  const outputSize = resultBlob.size;
  const originalSize = sourceAsset ? sourceAsset.currentSize : outputSize;
  const sizeDiffPercent = originalSize > 0
    ? Math.round(((outputSize - originalSize) / originalSize) * 100)
    : 0;

  const handleDownload = () => {
    let ext = 'png';
    if (resultBlob.type === 'application/pdf') ext = 'pdf';
    else if (resultBlob.type === 'image/x-icon') ext = 'ico';
    else if (resultBlob.type === 'image/bmp') ext = 'bmp';
    else if (resultBlob.type === 'image/avif') ext = 'avif';
    else if (resultBlob.type === 'image/webp') ext = 'webp';
    else if (resultBlob.type === 'image/jpeg') ext = 'jpg';
    else {
      ext = resultBlob.type.replace('image/', '') || 'png';
      if (ext === 'jpeg') ext = 'jpg';
    }
    const base = sourceAsset ? sourceAsset.filename.replace(/\.[^/.]+$/, '') : 'processed';
    const filename = `${base}-${variantType}.${ext}`;
    downloadService.downloadBlob(resultBlob, filename);
    toast.success('Download started');
  };

  const handleSaveToProjectOrLibrary = async () => {
    setSaving(true);
    try {
      const newAsset = await assetService.saveProcessedImage(
        sourceAsset ? sourceAsset.id : null,
        resultBlob,
        variantType,
        metadata,
        targetProjectId || null,
        undefined,
        operationNote,
        toolId
      );
      setSavedAsset(newAsset);
      await fetchAssets();
      toast.success(
        targetProjectId
          ? 'Saved new asset to project'
          : 'Saved new asset to shared library'
      );
      if (onSaved) onSaved(newAsset);
    } catch {
      toast.error('Failed to save image to workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleChainToTool = (route: string) => {
    if (savedAsset) {
      onClose();
      navigate(route, { state: { preselectedAssetId: savedAsset.id } });
    } else {
      // Auto-save first then navigate
      setSaving(true);
      assetService
        .saveProcessedImage(
          sourceAsset ? sourceAsset.id : null,
          resultBlob,
          variantType,
          metadata,
          targetProjectId || null,
          undefined,
          operationNote,
          toolId
        )
        .then(async (newAsset) => {
          await fetchAssets();
          onClose();
          navigate(route, { state: { preselectedAssetId: newAsset.id } });
        })
        .catch(() => {
          toast.error('Failed to save before opening in next tool');
        })
        .finally(() => setSaving(false));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Result Dialog */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col md:flex-row overflow-hidden">
        {/* Left Viewport: Result Preview */}
        <div className="flex-1 bg-zinc-100/70 dark:bg-[#0c0c0e] p-6 flex flex-col items-center justify-center relative min-h-[300px]">
          {resultUrl && (
            resultBlob.type === 'application/pdf' ? (
              <div className="w-full h-[380px] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white shadow-sm">
                <iframe
                  src={resultUrl}
                  title="PDF Document Preview"
                  className="w-full h-full border-none"
                />
              </div>
            ) : (
              <img
                src={resultUrl}
                alt="Processed output"
                className="max-h-[420px] max-w-full object-contain rounded-lg shadow-sm"
              />
            )
          )}

          {/* Quick Stats Overlays */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 font-mono">
            <span className="text-zinc-300">
              {outputWidth} × {outputHeight} px
            </span>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{formatBytes(outputSize)}</span>
              {sizeDiffPercent !== 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                    sizeDiffPercent < 0
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {sizeDiffPercent > 0 ? `+${sizeDiffPercent}%` : `${sizeDiffPercent}%`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Save & Chaining Options */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Processing Complete</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Project Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Destination Project</label>
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              >
                <option value="">General Library (Unassigned)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Save & Download Actions */}
            <div className="space-y-2">
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Result</span>
              </button>

              <button
                disabled={saving || !!savedAsset}
                onClick={handleSaveToProjectOrLibrary}
                className={`w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  savedAsset
                    ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                    : 'bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                }`}
              >
                {savedAsset ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Saved to Workspace</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{saving ? 'Saving...' : 'Save as Project Asset'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Continue in Next Tool (Chain) */}
            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Continue in Another Tool
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  onClick={() => handleChainToTool('/tools/compress')}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Minimize2 className="w-3 h-3 text-zinc-500" />
                    Compress
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                </button>

                <button
                  onClick={() => handleChainToTool('/tools/resize')}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Maximize2 className="w-3 h-3 text-zinc-500" />
                    Resize
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                </button>

                <button
                  onClick={() => handleChainToTool('/tools/crop')}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Crop className="w-3 h-3 text-zinc-500" />
                    Crop
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                </button>

                <button
                  onClick={() => handleChainToTool('/tools/collage')}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Layers className="w-3 h-3 text-zinc-500" />
                    Collage
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                </button>

                <button
                  onClick={() => handleChainToTool('/tools/background-remove')}
                  className="col-span-2 flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="w-3 h-3 text-zinc-500" />
                    Remove Background
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={onClose}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
