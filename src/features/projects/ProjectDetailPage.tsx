import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Images, ArrowLeft, UploadCloud } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { setActiveUploadModal } = useUIStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>

      <PageHeader
        title={`Project: ${id || 'Untitled'}`}
        description="View and manage assets, sub-folders, and editing drafts in this project."
        actions={
          <button
            onClick={() => setActiveUploadModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-semibold shadow-sm transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload to Project</span>
          </button>
        }
      />

      <EmptyState
        icon={Images}
        title="No assets in this project"
        description="Upload images directly or move existing library images into this project."
        action={{
          label: "Upload Images",
          onClick: () => setActiveUploadModal(true),
          icon: UploadCloud,
        }}
      />
    </div>
  );
};
