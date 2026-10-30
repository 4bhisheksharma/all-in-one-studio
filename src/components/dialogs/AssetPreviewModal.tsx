import React, { useEffect, useState } from 'react';
import { X, Download, Star, Trash2, ExternalLink, Calendar, HardDrive, Maximize2, Tag, History, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImageAsset } from '@/types';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { useAssetStore } from '@/stores/assetStore';
import { formatBytes, formatDate } from '@/utils/cn';
import { VersionHistoryPanel } from '@/components/version-history/VersionHistoryPanel';

interface AssetPreviewModalProps {
  asset: ImageAsset | null;
  onClose: () => void;
}

export const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({ asset, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [currentAsset, setCurrentAsset] = useState<ImageAsset | null>(asset);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const { toggleFavorite, softDelete } = useAssetStore();
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentAsset(asset);
  }, [asset]);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (currentAsset) {
      assetService.getAssetBlob(currentAsset.id).then((blob) => {
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
  }, [currentAsset]);

  if (!currentAsset) return null;


  const handleOpenInTool = (toolRoute: string) => {
    onClose();
    navigate(toolRoute, { state: { preselectedAssetId: currentAsset.id } });
  };

  const handleDownload = () => {
    downloadService.downloadAsset(currentAsset.id);
  };

  const handleDelete = async () => {
    await softDelete(currentAsset.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-5xl h-[88vh] rounded-xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-[#2a2a36] shadow-xl overflow-hidden flex flex-col animate-scale-in">
        {/* Top Tab Switcher */}
        <div className="h-12 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Version History</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono">
                v{currentAsset.version ?? 1}
              </span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Body */}
        {activeTab === 'history' ? (
          <div className="flex-1 overflow-hidden">
            <VersionHistoryPanel
              currentAsset={currentAsset}
              onSelectAsset={(updated) => setCurrentAsset(updated)}
              onClose={onClose}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left: Image Viewport */}
            <div className="flex-1 bg-zinc-100 dark:bg-[#070709] flex items-center justify-center p-4 relative overflow-hidden group">
              {fullUrl ? (
                <img
                  src={fullUrl}
                  alt={currentAsset.filename}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm select-none"
                />
              ) : (
                <div className="flex items-center gap-2 text-zinc-400 text-sm animate-pulse">
                  <span>Loading high-res preview...</span>
                </div>
              )}
            </div>

            {/* Right: Metadata Sidebar */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0e0e11] flex flex-col h-auto md:h-full">
              {/* Header */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="space-y-0.5 max-w-[200px]">
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate" title={currentAsset.filename}>
                    {currentAsset.filename}
                  </h3>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-mono">
                    {currentAsset.mimeType.replace('image/', '')}
                  </p>
                </div>
              </div>

              {/* Details Scroll Area */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
                {/* Metadata specs */}
                <div className="space-y-2.5 bg-white dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                      Dimensions
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-200">{currentAsset.width} × {currentAsset.height} px</span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                      File Size
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-200">{formatBytes(currentAsset.currentSize)}</span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      Added Date
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-200">{formatDate(currentAsset.createdAt)}</span>
                  </div>

                  {currentAsset.variantType && (
                    <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-zinc-400" />
                        Variant
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[10px] uppercase">
                        {currentAsset.variantType}
                      </span>
                    </div>
                  )}
                </div>

                {/* Open in Tool Quick Menu */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Open in Tool
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleOpenInTool('/tools/compress')}
                      className="flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                      Compress
                    </button>
                    <button
                      onClick={() => handleOpenInTool('/tools/resize')}
                      className="flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                      Resize
                    </button>
                    <button
                      onClick={() => handleOpenInTool('/tools/crop')}
                      className="flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                      Crop
                    </button>
                    <button
                      onClick={() => handleOpenInTool('/tools/background-remove')}
                      className="flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                      Remove BG
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 bg-white dark:bg-[#0e0e11]">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleFavorite(currentAsset.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      currentAsset.isFavorite
                        ? 'text-amber-500 bg-amber-500/10'
                        : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title="Favorite"
                  >
                    <Star className="w-4 h-4" fill={currentAsset.isFavorite ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Move to Trash"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
