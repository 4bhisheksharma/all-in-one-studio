import React, { useState } from 'react';
import { Download, Trash2, FolderInput, X } from 'lucide-react';
import { useAssetStore } from '@/stores/assetStore';
import { useProjectStore } from '@/stores/projectStore';
import { downloadService } from '@/services/export/downloadService';
import { toast } from 'sonner';

export const BatchActionBar: React.FC = () => {
  const { selectedIds, clearSelection, batchSoftDelete, batchMove } = useAssetStore();
  const { projects } = useProjectStore();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState('');

  if (selectedIds.length === 0) return null;

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
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-[#141419]/95 backdrop-blur-lg border border-[#2e2e3c] shadow-[0_8px_30px_rgb(0,0,0,0.5)] animate-slide-up max-w-[calc(100vw-20px)] overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 pl-1 pr-2 sm:pr-3 border-r border-[#2a2a36] text-xs font-semibold text-zinc-100 shrink-0">
          <span className="w-5 h-5 rounded-full bg-lime-400 text-black flex items-center justify-center font-mono text-[11px] font-bold">
            {selectedIds.length}
          </span>
          <span className="hidden xs:inline">Selected</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleBulkDownload}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors interactive-press"
          >
            <Download className="w-3.5 h-3.5 text-lime-400" />
            <span>Download ZIP</span>
          </button>

          <button
            onClick={() => setShowMoveModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            <FolderInput className="w-3.5 h-3.5 text-cyan-400" />
            <span>Move to Project</span>
          </button>

          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            onClick={clearSelection}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Move to Project Dialog */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowMoveModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-[#141418] border border-[#2a2a36] p-5 space-y-4">
            <h4 className="text-sm font-bold text-zinc-100">Move {selectedIds.length} Assets</h4>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Choose Destination Project</label>
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#282834] text-xs text-zinc-100 focus:outline-none focus:border-lime-400"
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
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMove}
                className="px-3.5 py-1.5 rounded-lg bg-lime-400 text-black text-xs font-semibold hover:bg-lime-300"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
