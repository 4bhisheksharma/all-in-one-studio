import React, { useEffect, useState } from 'react';
import { X, Download, Star, Trash2, ExternalLink, Calendar, HardDrive, Maximize2, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImageAsset } from '@/types';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { useAssetStore } from '@/stores/assetStore';
import { formatBytes, formatDate } from '@/utils/cn';

interface AssetPreviewModalProps {
  asset: ImageAsset | null;
  onClose: () => void;
}

export const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({ asset, onClose }) => {
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const { toggleFavorite, softDelete } = useAssetStore();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (asset) {
      assetService.getAssetBlob(asset.id).then((blob) => {
        if (active && blob) {
          createdUrl = URL.createObjectURL(blob);
          setFullUrl(createdUrl);
        }
      });
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [asset]);

  if (!asset) return null;

  const handleOpenInTool = (toolRoute: string) => {
    onClose();
    navigate(toolRoute, { state: { preselectedAssetId: asset.id } });
  };

  const handleDownload = () => {
    downloadService.downloadAsset(asset.id);
  };

  const handleDelete = async () => {
    await softDelete(asset.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-5xl h-[88vh] rounded-2xl bg-[#131317] border border-[#2a2a36] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left: Image Viewport */}
        <div className="flex-1 bg-[#0a0a0c] flex items-center justify-center p-4 relative overflow-hidden group">
          {fullUrl ? (
            <img
              src={fullUrl}
              alt={asset.filename}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg select-none"
            />
          ) : (
            <div className="flex items-center gap-2 text-zinc-500 text-sm animate-pulse">
              <span>Loading high-res preview...</span>
            </div>
          )}

          {/* Close button top right on mobile */}
          <button
            onClick={onClose}
            className="md:hidden absolute top-3 right-3 p-2 rounded-full bg-black/60 text-zinc-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Metadata Sidebar */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[#242430] bg-[#141418] flex flex-col h-auto md:h-full">
          {/* Header */}
          <div className="p-4 border-b border-[#23232c] flex items-center justify-between">
            <div className="space-y-0.5 max-w-[200px]">
              <h3 className="font-bold text-sm text-zinc-100 truncate" title={asset.filename}>
                {asset.filename}
              </h3>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-mono">
                {asset.mimeType.replace('image/', '')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details Scroll Area */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
            {/* Metadata specs */}
            <div className="space-y-2.5 bg-[#0e0e12] p-3 rounded-xl border border-[#20202a]">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-zinc-500" />
                  Dimensions
                </span>
                <span className="font-mono text-zinc-200">{asset.width} × {asset.height} px</span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                  File Size
                </span>
                <span className="font-mono text-zinc-200">{formatBytes(asset.currentSize)}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Added Date
                </span>
                <span className="text-zinc-200">{formatDate(asset.createdAt)}</span>
              </div>

              {asset.variantType && (
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-lime-400" />
                    Variant
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-lime-400/20 text-lime-400 font-mono text-[10px] uppercase">
                    {asset.variantType}
                  </span>
                </div>
              )}
            </div>

            {/* Open in Tool Quick Menu */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Open in Tool
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleOpenInTool('/tools/compress')}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-lime-400" />
                  Compress
                </button>
                <button
                  onClick={() => handleOpenInTool('/tools/resize')}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-emerald-400" />
                  Resize
                </button>
                <button
                  onClick={() => handleOpenInTool('/tools/crop')}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-cyan-400" />
                  Crop
                </button>
                <button
                  onClick={() => handleOpenInTool('/tools/background-remove')}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-pink-400" />
                  Remove BG
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[#23232c] flex items-center justify-between gap-2 bg-[#0e0e12]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleFavorite(asset.id)}
                className={`p-2 rounded-lg transition-colors ${
                  asset.isFavorite
                    ? 'text-yellow-400 bg-yellow-400/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Favorite"
              >
                <Star className="w-4 h-4" fill={asset.isFavorite ? 'currentColor' : 'none'} />
              </button>

              <button
                onClick={handleDelete}
                className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black font-semibold text-xs transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
