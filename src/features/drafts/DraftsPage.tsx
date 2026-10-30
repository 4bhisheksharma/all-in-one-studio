import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileEdit,
  Trash2,
  ArrowRight,
  Maximize2,
  Crop,
  Layers,
  Sparkles,
  EyeOff,
  RefreshCw,
  Sliders,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { AssetThumbnail } from '@/components/asset-grid/AssetThumbnail';
import { useDraftStore } from '@/stores/draftStore';
import { ToolType, EditorDraft } from '@/types';

const TOOL_CONFIG: Record<ToolType, { name: string; path: string; icon: React.ElementType; color: string }> = {
  compress: { name: 'Image Compressor', path: '/tools/compress', icon: RefreshCw, color: 'text-emerald-500' },
  resize: { name: 'Image Resizer', path: '/tools/resize', icon: Maximize2, color: 'text-sky-400' },
  crop: { name: 'Image Cropper', path: '/tools/crop', icon: Crop, color: 'text-indigo-400' },
  collage: { name: 'Collage Maker', path: '/tools/collage', icon: Layers, color: 'text-amber-400' },
  'bg-remove': { name: 'Background Remover', path: '/tools/background-remove', icon: Sparkles, color: 'text-emerald-400' },
  'face-blur': { name: 'Face & Region Blur', path: '/tools/face-blur', icon: EyeOff, color: 'text-rose-400' },
  convert: { name: 'Format Converter', path: '/tools/convert', icon: RefreshCw, color: 'text-teal-400' },
  utilities: { name: 'Image Utilities', path: '/tools/utilities', icon: Sliders, color: 'text-purple-400' },
};

export const DraftsPage: React.FC = () => {
  const navigate = useNavigate();
  const { drafts, loading, fetchDrafts, deleteDraft, clearAllDrafts } = useDraftStore();

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleResume = (draft: EditorDraft) => {
    const toolInfo = TOOL_CONFIG[draft.toolType];
    if (toolInfo) {
      navigate(toolInfo.path, {
        state: {
          preselectedAssetId: draft.sourceAssetIds[0],
          restoredDraft: draft,
        },
      });
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Unfinished Drafts"
          description="Resume incomplete editing sessions from Compressor, Cropper, Collage Maker, and other tools."
        />

        {drafts.length > 0 && (
          <button
            onClick={() => clearAllDrafts()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-zinc-700/60 hover:border-red-500/30 text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Drafts</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <EmptyState
          icon={FileEdit}
          title="No saved drafts"
          description="Whenever you start editing an image or assembling a collage, your adjustments are autosaved locally so you never lose your progress."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map((draft) => {
            const tool = TOOL_CONFIG[draft.toolType] || {
              name: draft.toolType,
              path: '/',
              icon: FileEdit,
              color: 'text-zinc-400',
            };
            const Icon = tool.icon;

            return (
              <div
                key={draft.id}
                className="group p-4 rounded-2xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                      <Icon className={`w-4 h-4 ${tool.color}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{tool.name}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(draft.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteDraft(draft.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                    title="Delete draft"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Source Assets Preview Thumbnail */}
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/80 flex items-center gap-3">
                  {draft.sourceAssetIds.length > 0 ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0">
                      <AssetThumbnail assetId={draft.sourceAssetIds[0]} alt="Draft Source" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-600 shrink-0">
                      <FileEdit className="w-5 h-5" />
                    </div>
                  )}

                  <div className="text-xs space-y-0.5 truncate">
                    <p className="text-zinc-800 dark:text-zinc-300 font-medium truncate">
                      {draft.sourceAssetIds.length === 1
                        ? '1 Source Image'
                        : `${draft.sourceAssetIds.length} Images in Session`}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">
                      {Object.keys(draft.config).length} parameters saved
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleResume(draft)}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group/btn active:scale-[0.98]"
                >
                  <span>Resume Session</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
