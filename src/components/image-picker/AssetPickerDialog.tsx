import React, { useEffect, useState } from 'react';
import { X, Search, Check, UploadCloud, Folder } from 'lucide-react';
import { ImageAsset } from '@/types';
import { useAssetStore } from '@/stores/assetStore';
import { useProjectStore } from '@/stores/projectStore';
import { AssetThumbnail } from '@/components/asset-grid/AssetThumbnail';
import { UploadDropzone } from '@/components/common/UploadDropzone';
import { formatBytes, cn } from '@/utils/cn';

interface AssetPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selectedAssets: ImageAsset[]) => void;
  multiSelect?: boolean;
  maxSelect?: number;
  title?: string;
  description?: string;
}

export const AssetPickerDialog: React.FC<AssetPickerDialogProps> = ({
  open,
  onClose,
  onSelect,
  multiSelect = false,
  maxSelect,
  title = 'Select Image Asset',
  description = 'Choose existing images from your library or upload new files.',
}) => {
  const { assets, fetchAssets } = useAssetStore();
  const { projects, fetchProjects } = useProjectStore();

  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchAssets({ isTrash: false });
      fetchProjects();
      setSelectedAssetIds([]);
      setSearch('');
    }
  }, [open, fetchAssets, fetchProjects]);

  if (!open) return null;

  const filteredAssets = assets.filter((asset) => {
    if (selectedProjectId !== 'all') {
      if (selectedProjectId === 'unassigned' && asset.projectId !== null) return false;
      if (selectedProjectId !== 'unassigned' && asset.projectId !== selectedProjectId) return false;
    }
    if (search.trim()) {
      return asset.filename.toLowerCase().includes(search.toLowerCase().trim());
    }
    return true;
  });

  const handleToggleSelect = (asset: ImageAsset) => {
    if (!multiSelect) {
      onSelect([asset]);
      onClose();
      return;
    }

    if (selectedAssetIds.includes(asset.id)) {
      setSelectedAssetIds(selectedAssetIds.filter((id) => id !== asset.id));
    } else {
      if (maxSelect && selectedAssetIds.length >= maxSelect) {
        return; // reached limit
      }
      setSelectedAssetIds([...selectedAssetIds, asset.id]);
    }
  };

  const handleConfirmMultiSelect = () => {
    const chosen = assets.filter((a) => selectedAssetIds.includes(a.id));
    onSelect(chosen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-4xl h-[85vh] rounded-xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-[#22222a] shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab & Filter Bar */}
        <div className="p-3 sm:px-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab('library')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'library'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              )}
            >
              Shared Library ({filteredAssets.length})
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'upload'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              )}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload New</span>
            </button>
          </div>

          {activeTab === 'library' && (
            <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
              {/* Project Filter */}
              {projects.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="all">All Projects</option>
                    <option value="unassigned">General Library</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'upload' ? (
            <div className="max-w-xl mx-auto pt-4">
              <UploadDropzone
                onUploadComplete={() => {
                  setActiveTab('library');
                  fetchAssets({ isTrash: false });
                }}
              />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-zinc-400 space-y-2">
              <Folder className="w-10 h-10 stroke-1 opacity-50" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No images found</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                No image assets match your query. Switch to Upload to add images to your library.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredAssets.map((asset) => {
                const isSelected = selectedAssetIds.includes(asset.id);
                return (
                  <div
                    key={asset.id}
                    onClick={() => handleToggleSelect(asset)}
                    className={cn(
                      'group relative rounded-lg bg-white dark:bg-[#0e0e11] border overflow-hidden cursor-pointer transition-colors flex flex-col',
                      isSelected
                        ? 'border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    )}
                  >
                    <div className="aspect-square w-full bg-zinc-100 dark:bg-zinc-900 relative overflow-hidden">
                      <AssetThumbnail assetId={asset.id} alt={asset.filename} />
                      {multiSelect && (
                        <div
                          className={cn(
                            'absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition-all',
                            isSelected
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                              : 'bg-black/40 border border-white/20 text-transparent opacity-0 group-hover:opacity-100'
                          )}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      )}
                    </div>

                    <div className="p-2 space-y-0.5">
                      <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate" title={asset.filename}>
                        {asset.filename}
                      </p>
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                        <span>{asset.width}×{asset.height}</span>
                        <span>{formatBytes(asset.currentSize)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer for multiSelect */}
        {multiSelect && activeTab === 'library' && (
          <div className="p-3 sm:px-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {selectedAssetIds.length} asset{selectedAssetIds.length === 1 ? '' : 's'} selected
              {maxSelect ? ` (max ${maxSelect})` : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={selectedAssetIds.length === 0}
                onClick={handleConfirmMultiSelect}
                className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Choose Selected ({selectedAssetIds.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
