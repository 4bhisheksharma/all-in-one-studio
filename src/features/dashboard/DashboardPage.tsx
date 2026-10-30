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
        title="Workspace Overview"
        description="Client-side creative image suite. Process, optimize, and organize assets securely in local storage."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCreateProjectModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-xs font-medium transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
            <button
              onClick={() => setActiveUploadModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Images</span>
            </button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-fade-in">
        <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Total Images</span>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">{assets.length}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/40 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
            <Images className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Active Projects</span>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">{projects.length}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/40 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
            <FolderPlus className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Storage Used</span>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">{formatBytes(storageUsed)}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/40 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
            <HardDrive className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Privacy Status</span>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              100% Client-Side
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/40 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Featured Recipe Banner: Smart Image Recipes */}
      <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
            <Wand2 className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60">
                Pipeline
              </span>
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Smart Image Recipes</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Chain multi-step transformations (resize, format conversion, compression) and batch apply across library assets.
            </p>
          </div>
        </div>

        <Link
          to="/recipes"
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Open Smart Recipes</span>
        </Link>
      </div>

      {/* Quick Launchpad */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Image Processing Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.to}
                to={tool.to}
                className="interactive-card group p-3.5 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between h-30"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <h3 className="font-medium text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white">{tool.title}</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">{tool.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Assets Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Recently Added Assets
          </h2>
          {assets.length > 0 && (
            <Link to="/library" className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
