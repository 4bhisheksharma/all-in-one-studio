import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { FileEdit } from 'lucide-react';

export const DraftsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Unfinished Drafts"
        description="Resume incomplete editing sessions from Compressor, Cropper, Collage Maker, and other tools."
      />

      <EmptyState
        icon={FileEdit}
        title="No saved drafts"
        description="Whenever you start editing an image or assembling a collage, your progress is autosaved locally so you never lose work."
      />
    </div>
  );
};
