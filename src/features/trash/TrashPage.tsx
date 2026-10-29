import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Trash2 } from 'lucide-react';

export const TrashPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Trash"
        description="Soft-deleted images. Items can be restored to your library or permanently removed to reclaim storage."
      />

      <EmptyState
        icon={Trash2}
        title="Trash is empty"
        description="Deleted images stay in your trash until permanently emptied."
      />
    </div>
  );
};
