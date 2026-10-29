import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { AssetCard } from '@/components/asset-grid/AssetCard';
import { AssetPreviewModal } from '@/components/dialogs/AssetPreviewModal';
import { BatchActionBar } from '@/components/asset-grid/BatchActionBar';
import { Star } from 'lucide-react';
import { useAssetStore } from '@/stores/assetStore';
import { ImageAsset } from '@/types';

export const FavoritesPage: React.FC = () => {
  const { assets, fetchAssets } = useAssetStore();
  const [previewAsset, setPreviewAsset] = useState<ImageAsset | null>(null);

  useEffect(() => {
    fetchAssets({ isFavorite: true, isTrash: false });
  }, [fetchAssets]);

  const favoriteAssets = assets.filter((a) => a.isFavorite && !a.isTrash);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Favorite Images"
        description="Your starred images across all projects and library folders."
        badge={
          <span className="px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-semibold border border-yellow-400/20">
            {favoriteAssets.length} starred
          </span>
        }
      />

      {favoriteAssets.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No favorites yet"
          description="Click the star icon on any image card in your library to pin it here for rapid access."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {favoriteAssets.map((asset) => (
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
