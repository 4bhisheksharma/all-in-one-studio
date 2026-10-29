import React, { useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { FolderKanban, Plus, Folder, Calendar, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDate } from '@/utils/cn';

export const ProjectsPage: React.FC = () => {
  const { projects, fetchProjects, deleteProject } = useProjectStore();
  const { setActiveCreateProjectModal } = useUIStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? Assets will be retained in the general library.')) {
      await deleteProject(id, false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Projects"
        description="Organize your image assets, folders, and editing workflows into dedicated projects."
        actions={
          <button
            onClick={() => setActiveCreateProjectModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects created yet"
          description="Projects help you organize image assets for specific clients, campaigns, or websites."
          action={{
            label: "Create First Project",
            onClick: () => setActiveCreateProjectModal(true),
            icon: Plus,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group relative flex flex-col justify-between p-5 rounded-xl bg-[#131317] border border-[#22222a] hover:border-zinc-700 hover:bg-[#16161d] transition-all duration-200 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400 transition-transform group-hover:scale-105">
                    <Folder className="w-5 h-5" />
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-zinc-100 group-hover:text-lime-400 transition-colors truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {project.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#1e1e26] flex items-center justify-between text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(project.updatedAt)}
                </span>
                <span className="flex items-center gap-1 text-zinc-400 group-hover:text-lime-400 font-semibold transition-colors">
                  Open Project
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
