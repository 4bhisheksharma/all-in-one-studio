import React, { useState } from 'react';
import { Star, MoreVertical, Check } from 'lucide-react';
import { ImageAsset } from '@/types';
import { AssetThumbnail } from './AssetThumbnail';
import { AssetContextMenu } from './AssetContextMenu';
import { useAssetStore } from '@/stores/assetStore';
import { formatBytes, cn } from '@/utils/cn';

interface AssetCardProps {
  asset: ImageAsset;
  onOpenPreview: (asset: ImageAsset) => void;
  isTrashView?: boolean;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onOpenPreview, isTrashView = false }) => {
  const { selectedIds, toggleSelect, toggleFavorite } = useAssetStore();
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const isSelected = selectedIds.includes(asset.id);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleDotsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.bottom + 4 });
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(asset.id);
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelect(asset.id);
  };

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        onClick={() => onOpenPreview(asset)}
        className={cn(
          'interactive-card group relative flex flex-col rounded-xl bg-[#131317] border transition-all duration-200 cursor-pointer overflow-hidden select-none hover:shadow-lg',
          isSelected
            ? 'border-lime-400 ring-1 ring-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.15)]'
            : 'border-[#22222a] hover:border-zinc-700 hover:bg-[#16161d]'
        )}
      >
        {/* Thumbnail Viewport */}
        <div className="relative aspect-square w-full overflow-hidden bg-[#0c0c0e]">
          <AssetThumbnail assetId={asset.id} alt={asset.filename} />

          {/* Top Overlays: Checkbox & Star */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
            <button
              onClick={handleSelectClick}
              className={cn(
                'w-6 h-6 sm:w-5 sm:h-5 rounded-md flex items-center justify-center transition-all interactive-press',
                isSelected
                  ? 'bg-lime-400 text-black shadow-sm opacity-100'
                  : 'bg-black/60 text-white/40 hover:text-white/80 hover:bg-black/80 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 border border-white/20'
              )}
              title={isSelected ? 'Deselect' : 'Select'}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            {!isTrashView && (
              <button
                onClick={handleFavoriteClick}
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center transition-all interactive-press',
                  asset.isFavorite
                    ? 'text-yellow-400 bg-black/60 shadow-sm opacity-100'
                    : 'text-white/70 hover:text-yellow-400 bg-black/50 hover:bg-black/80 opacity-80 sm:opacity-0 sm:group-hover:opacity-100'
                )}
                title={asset.isFavorite ? 'Remove Favorite' : 'Favorite'}
              >
                <Star className="w-3.5 h-3.5" fill={asset.isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}

            <button
              onClick={handleDotsClick}
              className="w-6 h-6 rounded-md flex items-center justify-center text-white/70 hover:text-white bg-black/50 hover:bg-black/80 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all interactive-press"
              title="More actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Variant Badge */}
          {asset.variantType && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-lime-400/40 text-[9px] font-mono uppercase text-lime-400 tracking-wider font-semibold">
                {asset.variantType}
              </span>
            </div>
          )}
        </div>

        {/* Card Footer Info */}
        <div className="p-3 space-y-1">
          <p className="text-xs font-semibold text-zinc-200 truncate" title={asset.filename}>
            {asset.filename}
          </p>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>{asset.width}×{asset.height}</span>
            <span>{formatBytes(asset.currentSize)}</span>
          </div>
        </div>
      </div>

      {menuPos && (
        <AssetContextMenu
          asset={asset}
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuPos(null)}
          onOpenPreview={() => onOpenPreview(asset)}
          isTrashView={isTrashView}
        />
      )}
    </>
  );
};
