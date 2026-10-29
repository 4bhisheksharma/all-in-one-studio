import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { AssetCard } from '@/components/asset-grid/AssetCard';
import { AssetListRow } from '@/components/asset-grid/AssetListRow';
import { BatchActionBar } from '@/components/asset-grid/BatchActionBar';
import { AssetPreviewModal } from '@/components/dialogs/AssetPreviewModal';
import {
  Images,
  UploadCloud,
  Search,
  LayoutGrid,
  List,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { useAssetStore } from '@/stores/assetStore';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { ImageAsset, AssetSortOption } from '@/types';
import { SmartCollection } from '@/types/smartCollection';
import { smartCollectionService } from '@/services/storage/smartCollectionService';
import { SmartCollectionsBar } from '@/components/smart-collections/SmartCollectionsBar';

export const LibraryPage: React.FC = () => {
  const { assets, filter, setFilter, fetchAssets, selectedIds, selectAll, clearSelection } = useAssetStore();
  const { projects, fetchProjects } = useProjectStore();
  const { viewMode, setViewMode, setActiveUploadModal } = useUIStore();

  const [previewAsset, setPreviewAsset] = useState<ImageAsset | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<SmartCollection | null>(null);

  useEffect(() => {
    fetchAssets({ isTrash: false });
    fetchProjects();
  }, [fetchAssets, fetchProjects]);

  const displayedAssets = selectedCollection
    ? smartCollectionService.filterAssets(assets, selectedCollection)
    : assets;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({ search: e.target.value });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter({ sortBy: e.target.value as AssetSortOption });
  };

  const handleProjectFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFilter({ projectId: val === 'all' ? undefined : val === 'unassigned' ? null : val });
  };

  const handleFormatFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFilter({ mimeType: val === 'all' ? undefined : val });
  };

  const allSelected = displayedAssets.length > 0 && selectedIds.length === displayedAssets.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(displayedAssets.map((a) => a.id));
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="All Images"
        description="Unified library of all uploaded and processed image assets across your projects."
        actions={
          <button
            onClick={() => setActiveUploadModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-semibold shadow-sm transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Images</span>
          </button>
        }
      />

      {/* Dynamic Smart Asset Collections Bar */}
      <SmartCollectionsBar
        assets={assets}
        selectedCollectionId={selectedCollection?.id || null}
        onSelectCollection={setSelectedCollection}
      />

      {/* Filter & Controls Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl bg-[#121216] border border-[#23232c]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by filename or tags..."
            value={filter.search || ''}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0e0e12] border border-[#242430] text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-lime-400"
          />
        </div>

        {/* Filter Dropdowns & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Select All Checkbox Button */}
          {displayedAssets.length > 0 && (
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#242430] text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-lime-400" />
              ) : (
                <Square className="w-4 h-4 text-zinc-500" />
              )}
              <span className="hidden sm:inline">Select All</span>
            </button>
          )}

          {/* Project Filter */}
          {projects.length > 0 && (
            <div className="relative flex items-center">
              <select
                onChange={handleProjectFilterChange}
                className="px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#242430] text-xs text-zinc-300 focus:outline-none focus:border-lime-400"
                defaultValue="all"
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

          {/* Format Filter */}
          <div className="relative flex items-center">
            <select
              onChange={handleFormatFilterChange}
              className="px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#242430] text-xs text-zinc-300 focus:outline-none focus:border-lime-400"
              defaultValue="all"
            >
              <option value="all">All Formats</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="gif">GIF</option>
              <option value="svg">SVG</option>
            </select>
          </div>

          {/* Sort Option */}
          <div className="relative flex items-center">
            <select
              value={filter.sortBy || 'date-desc'}
              onChange={handleSortChange}
              className="px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#242430] text-xs text-zinc-300 focus:outline-none focus:border-lime-400 font-sans"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name A → Z</option>
              <option value="name-desc">Name Z → A</option>
              <option value="size-desc">Largest Size</option>
              <option value="size-asc">Smallest Size</option>
              <option value="dims-desc">Highest Resolution</option>
            </select>
          </div>

          {/* Grid vs List View Toggles */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0e0e12] border border-[#242430]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-200'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-200'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Asset Content: Grid or List */}
      {displayedAssets.length === 0 ? (
        <EmptyState
          icon={Images}
          title={
            selectedCollection
              ? `No images match "${selectedCollection.name}"`
              : filter.search
              ? "No images match your search"
              : "Your library is empty"
          }
          description={
            selectedCollection
              ? "This smart collection rule currently has no matching assets. Any new matching image added to your library will appear here automatically."
              : filter.search
              ? `No images found matching "${filter.search}". Try clearing your filters.`
              : "Drag and drop image files anywhere or click Upload to populate your workspace."
          }
          action={{
            label: selectedCollection
              ? "Clear Smart Filter"
              : filter.search
              ? "Clear Search"
              : "Upload Image",
            onClick: () => {
              if (selectedCollection) {
                setSelectedCollection(null);
              } else if (filter.search) {
                setFilter({ search: '' });
              } else {
                setActiveUploadModal(true);
              }
            },
            icon: selectedCollection ? Sparkles : filter.search ? Filter : UploadCloud,
          }}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {displayedAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onOpenPreview={setPreviewAsset} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#22222a] bg-[#121217] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#22222a] bg-[#0f0f13] text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="py-2.5 px-3 w-10"></th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Dimensions</th>
                <th className="py-2.5 px-3 hidden md:table-cell">Size</th>
                <th className="py-2.5 px-3 hidden lg:table-cell">Type</th>
                <th className="py-2.5 px-3 hidden md:table-cell">Added</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedAssets.map((asset) => (
                <AssetListRow key={asset.id} asset={asset} onOpenPreview={setPreviewAsset} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Batch Actions Bar */}
      <BatchActionBar />

      {/* Detail Preview Modal */}
      {previewAsset && (
        <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      )}
    </div>
  );
};
