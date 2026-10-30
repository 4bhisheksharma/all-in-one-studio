import React, { useState } from 'react';
import { Star, MoreVertical, Check } from 'lucide-react';
import { ImageAsset } from '@/types';
import { AssetThumbnail } from './AssetThumbnail';
import { AssetContextMenu } from './AssetContextMenu';
import { useAssetStore } from '@/stores/assetStore';
import { formatBytes, formatDate, cn } from '@/utils/cn';

interface AssetListRowProps {
  asset: ImageAsset;
  onOpenPreview: (asset: ImageAsset) => void;
  isTrashView?: boolean;
}

export const AssetListRow: React.FC<AssetListRowProps> = ({ asset, onOpenPreview, isTrashView = false }) => {
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

  return (
    <>
      <tr
        onContextMenu={handleContextMenu}
        onClick={() => onOpenPreview(asset)}
        className={cn(
          'group border-b border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-[#15151c] transition-colors cursor-pointer text-xs text-zinc-700 dark:text-zinc-300 select-none',
          isSelected && 'bg-zinc-100/80 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
        )}
      >
        {/* Checkbox */}
        <td className="py-2.5 px-3 w-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => toggleSelect(asset.id)}
            className={cn(
              'w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer',
              isSelected
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'border border-zinc-300 dark:border-zinc-700 hover:border-zinc-500'
            )}
          >
            {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
          </button>
        </td>

        {/* Thumbnail + Name */}
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0">
              <AssetThumbnail assetId={asset.id} alt={asset.filename} />
            </div>
            <div className="space-y-0.5 truncate max-w-xs sm:max-w-md">
              <span className="font-medium text-zinc-900 dark:text-zinc-200 block truncate" title={asset.filename}>
                {asset.filename}
              </span>
              {asset.variantType && (
                <span className="inline-block px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 font-mono text-[9px] uppercase">
                  {asset.variantType}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Dimensions */}
        <td className="py-2.5 px-3 font-mono text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
          {asset.width} × {asset.height}
        </td>

        {/* File Size */}
        <td className="py-2.5 px-3 font-mono text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
          {formatBytes(asset.currentSize)}
        </td>

        {/* Format */}
        <td className="py-2.5 px-3 uppercase font-mono text-zinc-400 dark:text-zinc-500 hidden lg:table-cell">
          {asset.mimeType.replace('image/', '')}
        </td>

        {/* Date */}
        <td className="py-2.5 px-3 text-zinc-400 dark:text-zinc-500 hidden md:table-cell">
          {formatDate(asset.createdAt)}
        </td>

        {/* Actions */}
        <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {!isTrashView && (
              <button
                onClick={() => toggleFavorite(asset.id)}
                className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                  asset.isFavorite ? 'text-amber-500' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                <Star className="w-3.5 h-3.5" fill={asset.isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}

            <button
              onClick={handleDotsClick}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

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
