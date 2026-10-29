import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Maximize2, FolderOpen } from 'lucide-react';

export const ResizerPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Image Resizer"
        description="Scale dimensions by exact pixels, percentage, or one-click social media aspect presets."
      />

      <EmptyState
        icon={Maximize2}
        title="Select an image to resize"
        description="Pick an existing image from your library or drop a file to calculate new aspect dimensions."
        action={{
          label: "Choose from Library",
          onClick: () => {},
          icon: FolderOpen,
        }}
      />
    </div>
  );
};
