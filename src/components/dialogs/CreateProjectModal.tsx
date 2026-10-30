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
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => setActiveCreateProjectModal(false)}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-[#22222a] shadow-xl overflow-hidden p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Create New Project</h3>
          </div>
          <button
            onClick={() => setActiveCreateProjectModal(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="e.g. Website Assets, Campaign Q4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Description <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Add details about this project's purpose or image requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setActiveCreateProjectModal(false)}
              className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
