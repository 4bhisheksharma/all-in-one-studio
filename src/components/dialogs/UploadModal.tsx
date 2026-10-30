import React, { useState } from 'react';
import { X, Folder } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { UploadDropzone } from '@/components/common/UploadDropzone';

export const UploadModal: React.FC = () => {
  const { activeUploadModal, setActiveUploadModal } = useUIStore();
  const { projects } = useProjectStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  if (!activeUploadModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => setActiveUploadModal(false)}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl rounded-xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-[#22222a] shadow-xl overflow-hidden p-6 space-y-6 animate-scale-in">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Upload Images</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Add image assets to your shared workspace library.</p>
          </div>
          <button
            onClick={() => setActiveUploadModal(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project Assignment Dropdown */}
        {projects.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-zinc-500" />
              Assign to Project (Optional)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
            >
              <option value="">General Library (Unassigned)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Dropzone */}
        <UploadDropzone
          projectId={selectedProjectId || null}
          onUploadComplete={() => setActiveUploadModal(false)}
        />
      </div>
    </div>
  );
};
