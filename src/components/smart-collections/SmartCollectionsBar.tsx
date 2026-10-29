import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  FileImage,
  Layers,
  Maximize2,
  Globe,
} from 'lucide-react';
import { SmartCollection } from '@/types/smartCollection';
import { smartCollectionService } from '@/services/storage/smartCollectionService';
import { CreateSmartCollectionModal } from './CreateSmartCollectionModal';
import { ImageAsset } from '@/types';

interface SmartCollectionsBarProps {
  assets: ImageAsset[];
  selectedCollectionId: string | null;
  onSelectCollection: (collection: SmartCollection | null) => void;
}

export const SmartCollectionsBar: React.FC<SmartCollectionsBarProps> = ({
  assets,
  selectedCollectionId,
  onSelectCollection,
}) => {
  const [collections, setCollections] = useState<SmartCollection[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadCollections = async () => {
    const list = await smartCollectionService.getAllCollections();
    setCollections(list);
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const handleDeleteCustom = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await smartCollectionService.deleteCollection(id);
    if (selectedCollectionId === id) {
      onSelectCollection(null);
    }
    await loadCollections();
  };

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'FileImage':
        return <FileImage className="w-3.5 h-3.5" />;
      case 'Layers':
        return <Layers className="w-3.5 h-3.5" />;
      case 'Maximize2':
        return <Maximize2 className="w-3.5 h-3.5" />;
      case 'Globe':
        return <Globe className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs select-none">
        {/* All Assets pill */}
        <button
          onClick={() => onSelectCollection(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
            selectedCollectionId === null
              ? 'bg-zinc-800 text-lime-400 border border-zinc-700 shadow-sm'
              : 'bg-[#141419] text-zinc-400 hover:text-zinc-200 border border-[#23232d]'
          }`}
        >
          <span>All Images</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-900 text-zinc-400 font-mono">
            {assets.filter((a) => !a.isTrash).length}
          </span>
        </button>

        {/* Dynamic Collections */}
        {collections.map((col) => {
          const isSelected = selectedCollectionId === col.id;
          const count = assets.filter((a) => smartCollectionService.evaluateAsset(a, col)).length;

          return (
            <div
              key={col.id}
              onClick={() => onSelectCollection(col)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-lime-400/15 border-lime-400 text-lime-300 shadow-[0_0_12px_rgba(163,230,53,0.15)]'
                  : 'bg-[#141419] border-[#23232d] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <span className={isSelected ? 'text-lime-400' : 'text-zinc-500'}>
                {getIcon(col.icon)}
              </span>
              <span className="truncate max-w-[170px]" title={col.description}>
                {col.name}
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                isSelected ? 'bg-lime-400/30 text-lime-300' : 'bg-zinc-900 text-zinc-500'
              }`}>
                {count}
              </span>

              {!col.isBuiltIn && (
                <button
                  onClick={(e) => handleDeleteCustom(col.id, e)}
                  className="hidden group-hover:block ml-1 text-zinc-500 hover:text-red-400 transition-colors"
                  title="Delete collection rule"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Create collection button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-[#2d2d3a] hover:border-lime-400/60 text-zinc-400 hover:text-lime-400 text-xs transition-colors shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>New Smart Collection</span>
        </button>
      </div>

      <CreateSmartCollectionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(col) => {
          loadCollections();
          onSelectCollection(col);
        }}
      />
    </>
  );
};
