import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { AssetCard } from '@/components/asset-grid/AssetCard';
import { AssetPreviewModal } from '@/components/dialogs/AssetPreviewModal';
import { BatchActionBar } from '@/components/asset-grid/BatchActionBar';
import { Clock } from 'lucide-react';
import { useAssetStore } from '@/stores/assetStore';
import { ImageAsset } from '@/types';

export const RecentFilesPage: React.FC = () => {
  const { assets, fetchAssets } = useAssetStore();
  const [previewAsset, setPreviewAsset] = useState<ImageAsset | null>(null);

  useEffect(() => {
    fetchAssets({ isTrash: false, sortBy: 'date-desc' });
  }, [fetchAssets]);

  const recentAssets = assets.filter((a) => !a.isTrash);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Recent Files"
        description="Quickly access recently modified, processed, or uploaded image assets."
        badge={
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-700">
            {recentAssets.length} file{recentAssets.length === 1 ? '' : 's'}
          </span>
        }
      />

      {recentAssets.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No recent activity"
          description="Your recently opened and edited image assets will appear here."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {recentAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onOpenPreview={setPreviewAsset} />
          ))}
        </div>
      )}

      <BatchActionBar />

      {previewAsset && (
        <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      )}
    </div>
  );
};
