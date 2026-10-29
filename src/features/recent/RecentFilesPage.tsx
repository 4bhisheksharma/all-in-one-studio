import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Clock } from 'lucide-react';

export const RecentFilesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recent Files"
        description="Quickly access recently modified, processed, or uploaded image assets."
      />

      <EmptyState
        icon={Clock}
        title="No recent activity"
        description="Your recently opened and edited image assets will appear here."
      />
    </div>
  );
};
