import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Minimize2,
  Maximize2,
  Crop,
  Layers,
  Sparkles,
  EyeOff,
  RefreshCw,
  Star,
  Copy,
  Download,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { ImageAsset } from '@/types';
import { useAssetStore } from '@/stores/assetStore';
import { downloadService } from '@/services/export/downloadService';

interface AssetContextMenuProps {
  asset: ImageAsset;
  x: number;
  y: number;
  onClose: () => void;
  onOpenPreview: () => void;
  isTrashView?: boolean;
}

export const AssetContextMenu: React.FC<AssetContextMenuProps> = ({
  asset,
  x,
  y,
  onClose,
  onOpenPreview,
  isTrashView = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toggleFavorite, duplicate, softDelete, restore, permanentlyDelete } = useAssetStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', onClose);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', onClose);
    };
  }, [onClose]);

  const handleToolNavigate = (path: string) => {
    onClose();
    navigate(path, { state: { preselectedAssetId: asset.id } });
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${y}px`, left: `${x}px` }}
      className="fixed z-50 w-56 rounded-xl bg-white dark:bg-[#16161b] border border-zinc-200 dark:border-[#2a2a36] shadow-xl py-1 text-xs text-zinc-700 dark:text-zinc-300 font-medium select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        onClick={() => {
          onClose();
          onOpenPreview();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
      >
        <Eye className="w-4 h-4 text-zinc-400" />
        <span>Open Preview</span>
      </button>

      {!isTrashView ? (
        <>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

          {/* Tool quick launches */}
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Open in Tool
          </div>
          <button
            onClick={() => handleToolNavigate('/tools/compress')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5 text-zinc-500" />
            <span>Compressor</span>
          </button>
          <button
            onClick={() => handleToolNavigate('/tools/resize')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5 text-zinc-500" />
            <span>Resizer</span>
          </button>
          <button
            onClick={() => handleToolNavigate('/tools/crop')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
          >
            <Crop className="w-3.5 h-3.5 text-zinc-500" />
            <span>Cropper</span>
          </button>
          <button
            onClick={() => handleToolNavigate('/tools/collage')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            <span>Add to Collage</span>
          </button>
          <button
            onClick={() => handleToolNavigate('/tools/background-remove')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            <span>Remove Background</span>
          </button>
          <button
            onClick={() => handleToolNavigate('/tools/face-blur')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
            <span>Face & Region Blur</span>
          </button>
          <button
            onClick={() => handleToolNavigate('/tools/convert')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
            <span>Convert Format</span>
          </button>

          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

          {/* Standard Actions */}
          <button
            onClick={() => {
              onClose();
              toggleFavorite(asset.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
          >
            <Star className={`w-3.5 h-3.5 ${asset.isFavorite ? 'text-amber-500' : 'text-zinc-400'}`} />
            <span>{asset.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</span>
          </button>

          <button
            onClick={async () => {
              onClose();
              await duplicate(asset.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
            <span>Duplicate Asset</span>
          </button>

          <button
            onClick={() => {
              onClose();
              downloadService.downloadAsset(asset.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Download</span>
          </button>

          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

          <button
            onClick={async () => {
              onClose();
              await softDelete(asset.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-500/10 hover:text-red-500 text-red-500 text-left transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Move to Trash</span>
          </button>
        </>
      ) : (
        <>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
          <button
            onClick={async () => {
              onClose();
              await restore(asset.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 text-left transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
            <span>Restore Image</span>
          </button>
          <button
            onClick={async () => {
              onClose();
              await permanentlyDelete(asset.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-500/10 hover:text-red-500 text-red-500 text-left transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Permanently</span>
          </button>
        </>
      )}
    </div>
  );
};
