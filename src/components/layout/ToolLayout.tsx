import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FolderOpen, X, RefreshCw, FileEdit } from 'lucide-react';
import { ImageAsset, ToolType, EditorDraft } from '@/types';
import { assetService } from '@/services/storage/assetService';
import { draftService } from '@/services/storage/draftService';
import { AssetPickerDialog } from '@/components/image-picker/AssetPickerDialog';
import { AssetThumbnail } from '@/components/asset-grid/AssetThumbnail';
import { formatBytes } from '@/utils/cn';

interface ToolLayoutProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: (selectedAsset: ImageAsset | null, originalBlob: Blob | null) => React.ReactNode;
  previewContent?: (selectedAsset: ImageAsset | null, originalBlob: Blob | null) => React.ReactNode;
  onClear?: () => void;
  onAssetChange?: (asset: ImageAsset | null) => void;
}

export const ToolLayout: React.FC<ToolLayoutProps> = ({
  title,
  description,
  icon: Icon,
  children,
  previewContent,
  onClear,
  onAssetChange,
}) => {
  const location = useLocation();
  const preselectedId = (location.state as { preselectedAssetId?: string })?.preselectedAssetId;

  const [selectedAsset, setSelectedAsset] = useState<ImageAsset | null>(null);
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savedDraft, setSavedDraft] = useState<EditorDraft | null>(null);

  const toolType = useMemo<ToolType | null>(() => {
    const p = location.pathname;
    if (p.includes('/compress')) return 'compress';
    if (p.includes('/resize')) return 'resize';
    if (p.includes('/crop')) return 'crop';
    if (p.includes('/collage')) return 'collage';
    if (p.includes('/background-remove')) return 'bg-remove';
    if (p.includes('/face-blur')) return 'face-blur';
    if (p.includes('/convert')) return 'convert';
    if (p.includes('/utilities')) return 'utilities';
    return null;
  }, [location.pathname]);

  // Check for unfinished draft session
  useEffect(() => {
    let active = true;
    if (toolType && !selectedAsset && !preselectedId) {
      draftService.getDraft(toolType).then((draft) => {
        if (active && draft && draft.sourceAssetIds.length > 0) {
          setSavedDraft(draft);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [toolType, selectedAsset, preselectedId]);

  // Preselected Asset loader
  useEffect(() => {
    let active = true;
    if (preselectedId) {
      assetService.getAsset(preselectedId).then(async (asset) => {
        if (active && asset) {
          setSelectedAsset(asset);
          if (onAssetChange) onAssetChange(asset);
          const blob = await assetService.getAssetBlob(asset.id);
          if (active && blob) setOriginalBlob(blob);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [preselectedId, onAssetChange]);

  // Autosave draft on asset selection
  useEffect(() => {
    if (selectedAsset && toolType) {
      draftService.saveDraft(
        toolType,
        [selectedAsset.id],
        { filename: selectedAsset.filename },
        selectedAsset.projectId
      );
    }
  }, [selectedAsset, toolType]);

  const handleSelectAsset = async (assets: ImageAsset[]) => {
    if (assets.length > 0) {
      const asset = assets[0];
      setSelectedAsset(asset);
      setSavedDraft(null);
      if (onAssetChange) onAssetChange(asset);
      const blob = await assetService.getAssetBlob(asset.id);
      setOriginalBlob(blob || null);
    }
  };

  const handleResumeDraft = async () => {
    if (!savedDraft || savedDraft.sourceAssetIds.length === 0) return;
    const assetId = savedDraft.sourceAssetIds[0];
    const asset = await assetService.getAsset(assetId);
    if (asset) {
      setSelectedAsset(asset);
      if (onAssetChange) onAssetChange(asset);
      const blob = await assetService.getAssetBlob(asset.id);
      if (blob) setOriginalBlob(blob);
      setSavedDraft(null);
    }
  };

  const handleDiscardDraft = async () => {
    if (toolType) {
      await draftService.deleteDraftByTool(toolType);
      setSavedDraft(null);
    }
  };

  const handleClear = () => {
    setSelectedAsset(null);
    setOriginalBlob(null);
    if (toolType) draftService.deleteDraftByTool(toolType);
    if (onClear) onClear();
    if (onAssetChange) onAssetChange(null);
  };

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-6 pb-16">
      {/* Draft Recovery Banner */}
      {savedDraft && !selectedAsset && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <FileEdit className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-zinc-200">
              You have an unfinished editing session saved in your browser.
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleResumeDraft}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Resume Session
            </button>
            <button
              onClick={handleDiscardDraft}
              className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#22222a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">{title}</h1>
            <p className="text-xs text-zinc-400 max-w-xl">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedAsset && (
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change Image</span>
            </button>
          )}

          {!selectedAsset && (
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-semibold shadow-sm transition-all"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Select from Library</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Asset Header Chip */}
      {selectedAsset && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#141419] border border-[#262632] shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0">
              <AssetThumbnail assetId={selectedAsset.id} alt={selectedAsset.filename} />
            </div>
            <div className="space-y-0.5 truncate">
              <h4 className="text-xs font-bold text-zinc-200 truncate" title={selectedAsset.filename}>
                {selectedAsset.filename}
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                <span>{selectedAsset.width} × {selectedAsset.height} px</span>
                <span>•</span>
                <span>{formatBytes(selectedAsset.currentSize)}</span>
                <span>•</span>
                <span className="uppercase">{selectedAsset.mimeType.replace('image/', '')}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Deselect image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tool Two-Panel Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tool Controls */}
        <div className={`${isExpanded ? 'lg:col-span-4' : 'lg:col-span-5 xl:col-span-4'} space-y-4`}>
          {children(selectedAsset, originalBlob)}
        </div>

        {/* Right Column: Viewport / Interactive Preview */}
        <div
          className={`${
            isExpanded ? 'lg:col-span-8' : 'lg:col-span-7 xl:col-span-8'
          } min-h-[640px] lg:min-h-[740px] xl:min-h-[820px] rounded-2xl bg-[#0e0e12] border border-[#23232c] overflow-hidden flex flex-col justify-center items-center relative p-4 transition-all`}
        >
          {/* Maximize / Spacious toggle button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute top-3 right-3 z-30 px-2 py-1 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] rounded-lg border border-zinc-800 shadow backdrop-blur transition-colors"
            title={isExpanded ? 'Normal workspace' : 'Expand workspace'}
          >
            {isExpanded ? 'Compact' : 'Expand Workspace'}
          </button>

          {previewContent ? (
            previewContent(selectedAsset, originalBlob)
          ) : selectedAsset && originalBlob ? (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={URL.createObjectURL(originalBlob)}
                alt="Selected"
                className="max-h-[640px] max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-300">No image loaded</p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Choose an existing image from your project library or upload a new photo.
                </p>
              </div>
              <button
                onClick={() => setPickerOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
              >
                Choose Image
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Shared Asset Picker */}
      <AssetPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectAsset}
      />
    </div>
  );
};
