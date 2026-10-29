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
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => setActiveUploadModal(false)}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-[#141418] border border-[#2a2a36] shadow-2xl overflow-hidden p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#23232c]">
          <div>
            <h3 className="text-lg font-bold text-zinc-100">Upload Images</h3>
            <p className="text-xs text-zinc-400">Add image assets to your shared workspace library.</p>
          </div>
          <button
            onClick={() => setActiveUploadModal(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Assignment Dropdown */}
        {projects.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-lime-400" />
              Assign to Project (Optional)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#262632] text-xs text-zinc-200 focus:border-lime-400 focus:outline-none"
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
