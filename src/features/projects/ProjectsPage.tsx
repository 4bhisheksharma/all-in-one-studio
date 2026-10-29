import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { FolderKanban, Plus } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export const ProjectsPage: React.FC = () => {
  const { setActiveCreateProjectModal } = useUIStore();

  return (
    <div className="space-y-6">
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
    </div>
  );
};
