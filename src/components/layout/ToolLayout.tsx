import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FolderOpen, X, RefreshCw } from 'lucide-react';
import { ImageAsset } from '@/types';
import { assetService } from '@/services/storage/assetService';
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

  const handleSelectAsset = async (assets: ImageAsset[]) => {
    if (assets.length > 0) {
      const asset = assets[0];
      setSelectedAsset(asset);
      if (onAssetChange) onAssetChange(asset);
      const blob = await assetService.getAssetBlob(asset.id);
      setOriginalBlob(blob || null);
    }
  };

  const handleClear = () => {
    setSelectedAsset(null);
    setOriginalBlob(null);
    if (onClear) onClear();
    if (onAssetChange) onAssetChange(null);
  };

  return (
    <div className="space-y-6 pb-16">
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
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {children(selectedAsset, originalBlob)}
        </div>

        {/* Right Column: Viewport / Interactive Preview */}
        <div className="lg:col-span-7 xl:col-span-8 min-h-[420px] rounded-2xl bg-[#0e0e12] border border-[#23232c] overflow-hidden flex flex-col justify-center items-center relative p-4">
          {previewContent ? (
            previewContent(selectedAsset, originalBlob)
          ) : selectedAsset && originalBlob ? (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={URL.createObjectURL(originalBlob)}
                alt="Selected"
                className="max-h-[500px] max-w-full object-contain rounded-lg shadow-md"
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
