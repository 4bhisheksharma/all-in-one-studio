import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { BatchQueueModal } from './BatchQueueModal';
import { useAssetStore } from '@/stores/assetStore';
import {
  CheckSquare,
  Square,
  Play,
} from 'lucide-react';
import { AssetThumbnail } from '@/components/asset-grid/AssetThumbnail';
import { formatBytes } from '@/utils/cn';

export const BatchQueuePage: React.FC = () => {
  const { assets, fetchAssets } = useAssetStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAssets({ isTrash: false });
  }, [fetchAssets]);

  const filteredAssets = assets.filter(
    (a) =>
      !a.isTrash &&
      (a.filename.toLowerCase().includes(search.toLowerCase()) ||
        a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())))
  );

  const allSelected =
    filteredAssets.length > 0 && selectedIds.length === filteredAssets.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAssets.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedAssets = assets.filter((a) => selectedIds.includes(a.id));

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Batch Processing Queue"
        description="Apply operations (compression, resizing, format conversion, neural background removal, watermarks, or smart recipes) across entire image collections."
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Process Queue ({selectedIds.length})</span>
          </button>
        }
      />

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#23232c]">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
            ) : (
              <Square className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            )}
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          <span className="text-xs text-zinc-500 font-mono">
            {selectedIds.length} of {filteredAssets.length} selected
          </span>
        </div>

        <input
          type="text"
          placeholder="Filter images by name or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 w-full sm:w-64"
        />
      </div>

      {/* Grid of selectable images */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredAssets.map((asset) => {
          const isSelected = selectedIds.includes(asset.id);

          return (
            <div
              key={asset.id}
              onClick={() => toggleSelect(asset.id)}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer select-none flex flex-col justify-between ${
                isSelected
                  ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100'
                  : 'bg-white dark:bg-[#131317] border-zinc-200 dark:border-[#22222a] hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase text-zinc-500">
                  {asset.mimeType.replace('image/', '')}
                </span>
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    isSelected
                      ? 'bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-zinc-900'
                      : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                  }`}
                >
                  {isSelected && <CheckSquare className="w-3 h-3 stroke-[2.5]" />}
                </div>
              </div>

              <div className="aspect-square w-full rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center relative mb-2">
                <AssetThumbnail assetId={asset.id} alt={asset.filename} />
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate" title={asset.filename}>
                  {asset.filename}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {formatBytes(asset.currentSize)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <BatchQueueModal
        initialAssets={selectedAssets}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
