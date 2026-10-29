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
    const ext = resultBlob.type.replace('image/', '') || 'png';
    const base = sourceAsset ? sourceAsset.filename.replace(/\.[^/.]+$/, '') : 'processed';
    const filename = `${base}-${variantType}.${ext === 'jpeg' ? 'jpg' : ext}`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      {/* Result Dialog */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#141419] border border-[#2e2e3c] shadow-2xl flex flex-col md:flex-row overflow-hidden">
        {/* Left Viewport: Result Preview */}
        <div className="flex-1 bg-[#0a0a0c] p-6 flex flex-col items-center justify-center relative min-h-[300px]">
          {resultUrl && (
            <img
              src={resultUrl}
              alt="Processed output"
              className="max-h-[420px] max-w-full object-contain rounded-lg shadow-xl"
            />
          )}

          {/* Quick Stats Overlays */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 font-mono">
            <span className="text-zinc-300">
              {outputWidth} × {outputHeight} px
            </span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-100 font-bold">{formatBytes(outputSize)}</span>
              {sizeDiffPercent !== 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    sizeDiffPercent < 0
                      ? 'bg-lime-400/20 text-lime-400'
                      : 'bg-amber-400/20 text-amber-400'
                  }`}
                >
                  {sizeDiffPercent > 0 ? `+${sizeDiffPercent}%` : `${sizeDiffPercent}%`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Save & Chaining Options */}
        <div className="w-full md:w-88 border-t md:border-t-0 md:border-l border-[#242430] bg-[#141418] p-5 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#23232c]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-lime-400" />
                <h3 className="font-bold text-sm text-zinc-100">Processing Complete</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Project Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Destination Project</label>
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#2a2a36] text-xs text-zinc-200 focus:outline-none focus:border-lime-400"
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download Result</span>
              </button>

              <button
                disabled={saving || !!savedAsset}
                onClick={handleSaveToProjectOrLibrary}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  savedAsset
                    ? 'bg-zinc-800 border-lime-400/40 text-lime-400'
                    : 'bg-[#1b1b22] hover:bg-[#22222a] border-[#2c2c38] text-zinc-200'
                }`}
              >
                {savedAsset ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Saved to Workspace</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4 text-zinc-400" />
                    <span>{saving ? 'Saving...' : 'Save as Project Asset'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Continue in Next Tool (Chain) */}
            <div className="space-y-2 pt-2 border-t border-[#23232c]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Continue in Another Tool
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  onClick={() => handleChainToTool('/tools/compress')}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Minimize2 className="w-3.5 h-3.5 text-lime-400" />
                    Compress
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                </button>

                <button
                  onClick={() => handleChainToTool('/tools/resize')}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                    Resize
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                </button>

                <button
                  onClick={() => handleChainToTool('/tools/crop')}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Crop className="w-3.5 h-3.5 text-cyan-400" />
                    Crop
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                </button>

                <button
                  onClick={() => handleChainToTool('/tools/collage')}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Collage
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                </button>

                <button
                  onClick={() => handleChainToTool('/tools/background-remove')}
                  className="col-span-2 flex items-center justify-between p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    Remove Background
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={onClose}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
