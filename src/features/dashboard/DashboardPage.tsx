import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  UploadCloud,
  FolderPlus,
  Minimize2,
  Maximize2,
  Layers,
  Sparkles,
  EyeOff,
  HardDrive,
  Images,
  ArrowRight,
  Wand2,
  Smartphone,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useAssetStore } from '@/stores/assetStore';
import { useProjectStore } from '@/stores/projectStore';
import { EmptyState } from '@/components/common/EmptyState';
import { AssetCard } from '@/components/asset-grid/AssetCard';
import { AssetPreviewModal } from '@/components/dialogs/AssetPreviewModal';
import { ImageAsset } from '@/types';
import { formatBytes } from '@/utils/cn';

export const DashboardPage: React.FC = () => {
  const { setActiveUploadModal, setActiveCreateProjectModal, storageUsed } = useUIStore();
  const { assets, fetchAssets } = useAssetStore();
  const { projects, fetchProjects } = useProjectStore();

  const [previewAsset, setPreviewAsset] = useState<ImageAsset | null>(null);

  useEffect(() => {
    fetchAssets({ isTrash: false });
    fetchProjects();
  }, [fetchAssets, fetchProjects]);

  const quickTools = [
    { title: 'Batch Queue', desc: 'Process entire collections with skip rules & retry', to: '/batch-queue', icon: Layers },
    { title: 'App Asset Generator', desc: 'Android, iOS Xcode & Favicon production bundles', to: '/tools/app-icons', icon: Smartphone },
    { title: 'Smart Recipes', desc: 'Batch apply multi-step sequences to 50+ images', to: '/recipes', icon: Wand2 },
    { title: 'Studio Canvas', desc: 'Freeform multi-layer composition & editing canvas', to: '/tools/canvas', icon: Layers },
    { title: 'Compressor', desc: 'Reduce file size while preserving quality', to: '/tools/compress', icon: Minimize2 },
    { title: 'Remove BG', desc: 'Neural AI foreground segmentation', to: '/tools/background-remove', icon: Sparkles },
    { title: 'Resizer', desc: 'Precise dimensions & social presets', to: '/tools/resize', icon: Maximize2 },
    { title: 'Face & Blur', desc: 'Auto-detect faces & blur sensitive regions', to: '/tools/face-blur', icon: EyeOff },
  ];

  const recentAssets = assets.slice(0, 6);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Welcome to Imago Studio"
        description="Your all-in-one client-side creative image workspace. Upload once, organize in projects, process anywhere, and reuse everywhere."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCreateProjectModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold border border-zinc-700 transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-zinc-300" />
              <span>Create Project</span>
            </button>
            <button
              onClick={() => setActiveUploadModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold shadow-sm transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Images</span>
            </button>
          </div>
        }
      />

      {/* Live Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <div className="p-4 rounded-xl bg-[#141418] border border-[#23232c] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-zinc-400">Total Images</span>
            <p className="text-2xl font-bold text-zinc-100 font-mono">{assets.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-300">
            <Images className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141418] border border-[#23232c] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-zinc-400">Active Projects</span>
            <p className="text-2xl font-bold text-zinc-100 font-mono">{projects.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-300">
            <FolderPlus className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141418] border border-[#23232c] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-zinc-400">Storage Used</span>
            <p className="text-2xl font-bold text-zinc-100 font-mono">{formatBytes(storageUsed)}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-300">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141418] border border-[#23232c] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-zinc-400">Privacy Mode</span>
            <p className="text-sm font-semibold text-zinc-200">100% Client-Side</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-300">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Featured Recipe Banner: Smart Image Recipes */}
      <div className="p-5 rounded-2xl bg-[#141418] border border-[#23232c] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-100 shrink-0">
            <Wand2 className="w-5 h-5 text-zinc-200" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                Automation
              </span>
              <h3 className="text-sm font-semibold text-zinc-100">Smart Image Recipes</h3>
              <span className="text-xs text-zinc-400">• Pipeline Execution</span>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Chain multi-step transformations (e.g. Website Product Image: resize 1200×1200, rounded corners, convert to WebP, compress under 150KB) and batch apply to library assets in one click.
            </p>
          </div>
        </div>

        <Link
          to="/recipes"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-xs shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Wand2 className="w-4 h-4 text-zinc-900" />
          <span>Open Smart Recipes</span>
        </Link>
      </div>

      {/* Quick Launchpad */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Quick Image Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {quickTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.to}
                to={tool.to}
                className="interactive-card group p-4 rounded-xl bg-[#131317] border border-[#22222a] hover:border-zinc-700 hover:bg-[#181820] transition-all flex flex-col justify-between h-36"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-200 group-hover:text-zinc-100">{tool.title}</h3>
                  <p className="text-xs text-zinc-500 line-clamp-1">{tool.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Assets Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Recently Added Assets
          </h2>
          {assets.length > 0 && (
            <Link to="/library" className="text-xs font-semibold text-lime-400 hover:underline flex items-center gap-1">
              <span>View All ({assets.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {assets.length === 0 ? (
          <EmptyState
            icon={Images}
            title="No images in your workspace yet"
            description="Upload images to organize them into projects and process them seamlessly across any editing tool."
            action={{
              label: "Upload Images",
              onClick: () => setActiveUploadModal(true),
              icon: UploadCloud,
            }}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {recentAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onOpenPreview={setPreviewAsset} />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewAsset && (
        <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      )}
    </div>
  );
};
