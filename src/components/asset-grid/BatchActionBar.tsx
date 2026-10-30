import React, { useState } from 'react';
import { Download, Trash2, FolderInput, X, Layers } from 'lucide-react';
import { useAssetStore } from '@/stores/assetStore';
import { useProjectStore } from '@/stores/projectStore';
import { downloadService } from '@/services/export/downloadService';
import { BatchQueueModal } from '@/features/batch-queue/BatchQueueModal';
import { toast } from 'sonner';

export const BatchActionBar: React.FC = () => {
  const { assets, selectedIds, clearSelection, batchSoftDelete, batchMove } = useAssetStore();
  const { projects } = useProjectStore();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState('');

  if (selectedIds.length === 0) return null;

  const selectedAssets = assets.filter((a) => selectedIds.includes(a.id));

  const handleBulkDownload = async () => {
    try {
      await downloadService.downloadBatchAsZip(selectedIds);
      toast.success(`Downloaded ${selectedIds.length} assets as ZIP`);
    } catch {
      toast.error('Failed to create ZIP package');
    }
  };

  const handleBulkDelete = async () => {
    await batchSoftDelete(selectedIds);
    toast.success(`Moved ${selectedIds.length} items to Trash`);
  };

  const handleConfirmMove = async () => {
    await batchMove(selectedIds, targetProjectId || null);
    toast.success(`Moved ${selectedIds.length} items to project`);
    setShowMoveModal(false);
  };

  return (
    <>
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2 rounded-xl bg-white/95 dark:bg-[#141418]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-lg animate-slide-up max-w-[calc(100vw-20px)] overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 pl-0.5 pr-2 sm:pr-3 border-r border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100 shrink-0">
          <span className="w-5 h-5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-mono text-[10px] font-medium">
            {selectedIds.length}
          </span>
          <span className="hidden xs:inline">Selected</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Process Batch</span>
          </button>

          <button
            onClick={handleBulkDownload}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download ZIP</span>
          </button>

          <button
            onClick={() => setShowMoveModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <FolderInput className="w-3.5 h-3.5" />
            <span>Move to Project</span>
          </button>

          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

          <button
            onClick={clearSelection}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Move to Project Dialog */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMoveModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-xl">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Move {selectedIds.length} Assets</h4>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Choose Destination Project</label>
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              >
                <option value="">General Library (Unassigned)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMoveModal(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMove}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Processing Queue Dialog */}
      <BatchQueueModal
        initialAssets={selectedAssets}
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
      />
    </>
  );
};
