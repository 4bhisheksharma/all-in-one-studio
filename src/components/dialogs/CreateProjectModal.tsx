import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';

export const CreateProjectModal: React.FC = () => {
  const { activeCreateProjectModal, setActiveCreateProjectModal } = useUIStore();
  const { createProject } = useProjectStore();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!activeCreateProjectModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setSubmitting(true);
    try {
      const project = await createProject(name, description);
      toast.success(`Project "${project.name}" created`);
      setActiveCreateProjectModal(false);
      setName('');
      setDescription('');
      navigate(`/projects/${project.id}`);
    } catch {
      toast.error('Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => setActiveCreateProjectModal(false)}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#141418] border border-[#2a2a36] shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between pb-3 border-b border-[#23232c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-lime-400/10 flex items-center justify-center text-lime-400">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-zinc-100">Create New Project</h3>
          </div>
          <button
            onClick={() => setActiveCreateProjectModal(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Project Name <span className="text-lime-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="e.g. Website Assets, Campaign Q4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#262632] text-sm text-zinc-100 focus:border-lime-400 focus:outline-none placeholder:text-zinc-600"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Description <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Add details about this project's purpose or image requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#262632] text-sm text-zinc-100 focus:border-lime-400 focus:outline-none placeholder:text-zinc-600 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setActiveCreateProjectModal(false)}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
