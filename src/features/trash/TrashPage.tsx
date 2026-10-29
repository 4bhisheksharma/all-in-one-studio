import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { AssetCard } from '@/components/asset-grid/AssetCard';
import { AssetPreviewModal } from '@/components/dialogs/AssetPreviewModal';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useAssetStore } from '@/stores/assetStore';
import { useUIStore } from '@/stores/uiStore';
import { ImageAsset } from '@/types';
import { toast } from 'sonner';

export const TrashPage: React.FC = () => {
  const { assets, fetchAssets, emptyTrash } = useAssetStore();
  const { setStorageStats } = useUIStore();
  const [previewAsset, setPreviewAsset] = useState<ImageAsset | null>(null);

  useEffect(() => {
    fetchAssets({ isTrash: true });
  }, [fetchAssets]);

  const trashedAssets = assets.filter((a) => a.isTrash);

  const handleEmptyTrash = async () => {
    if (confirm('Are you sure you want to permanently delete all items in trash? This cannot be undone.')) {
      await emptyTrash();
      if (navigator.storage && navigator.storage.estimate) {
        const { usage, quota } = await navigator.storage.estimate();
        setStorageStats(usage || 0, quota || 0);
      }
      toast.success('Trash emptied');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Trash"
        description="Soft-deleted images. Items can be restored to your library or permanently removed to reclaim browser storage."
        badge={
          trashedAssets.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 text-xs font-semibold border border-red-400/20">
              {trashedAssets.length} deleted
            </span>
          ) : undefined
        }
        actions={
          trashedAssets.length > 0 ? (
            <button
              onClick={handleEmptyTrash}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Empty Trash</span>
            </button>
          ) : undefined
        }
      />

      {trashedAssets.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          description="Deleted images will appear here where you can restore them or delete them permanently."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {trashedAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onOpenPreview={setPreviewAsset}
              isTrashView
            />
          ))}
        </div>
      )}

      {previewAsset && (
        <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      )}
    </div>
  );
};
