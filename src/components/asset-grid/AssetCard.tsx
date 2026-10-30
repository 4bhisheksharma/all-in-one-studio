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
          'interactive-card group relative flex flex-col rounded-xl bg-white dark:bg-[#121216] border transition-all duration-150 cursor-pointer overflow-hidden select-none',
          isSelected
            ? 'border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-sm'
            : 'border-zinc-200 dark:border-[#22222a] hover:border-zinc-300 dark:hover:border-zinc-700'
        )}
      >
        {/* Thumbnail Viewport */}
        <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-[#0c0c0e]">
          <AssetThumbnail assetId={asset.id} alt={asset.filename} />

          {/* Top Overlays: Checkbox & Star */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
            <button
              onClick={handleSelectClick}
              className={cn(
                'w-5 h-5 rounded-md flex items-center justify-center transition-all interactive-press',
                isSelected
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs opacity-100'
                  : 'bg-black/40 text-white/60 hover:text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 border border-white/20'
              )}
              title={isSelected ? 'Deselect' : 'Select'}
            >
              <Check className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>

          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            {!isTrashView && (
              <button
                onClick={handleFavoriteClick}
                className={cn(
                  'w-5 h-5 rounded-md flex items-center justify-center transition-all interactive-press',
                  asset.isFavorite
                    ? 'text-amber-400 bg-black/60 shadow-xs opacity-100'
                    : 'text-white/60 hover:text-amber-300 bg-black/40 hover:bg-black/70 opacity-0 group-hover:opacity-100'
                )}
                title={asset.isFavorite ? 'Remove Favorite' : 'Favorite'}
              >
                <Star className="w-3 h-3" fill={asset.isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}

            <button
              onClick={handleDotsClick}
              className="w-5 h-5 rounded-md flex items-center justify-center text-white/60 hover:text-white bg-black/40 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-all interactive-press"
              title="More actions"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>

          {/* Variant Badge */}
          {asset.variantType && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className="px-1.5 py-0.2 rounded bg-black/75 backdrop-blur-sm border border-white/10 text-[9px] font-mono uppercase text-zinc-300 tracking-wider font-medium">
                {asset.variantType}
              </span>
            </div>
          )}
        </div>

        {/* Card Footer Info */}
        <div className="p-2.5 space-y-0.5">
          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate" title={asset.filename}>
            {asset.filename}
          </p>

          <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
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
