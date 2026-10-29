import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Images, UploadCloud } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export const LibraryPage: React.FC = () => {
  const { setActiveUploadModal } = useUIStore();

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Images"
        description="Central library of all uploaded and processed image assets across your workspace."
        actions={
          <button
            onClick={() => setActiveUploadModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-semibold shadow-sm transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Images</span>
          </button>
        }
      />

      <EmptyState
        icon={Images}
        title="Your library is empty"
        description="Drag and drop image files anywhere or click Upload to populate your workspace."
        action={{
          label: "Upload Image",
          onClick: () => setActiveUploadModal(true),
          icon: UploadCloud,
        }}
      />
    </div>
  );
};
