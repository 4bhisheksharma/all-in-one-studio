import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Sparkles, FolderOpen } from 'lucide-react';

export const BackgroundRemoverPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Remove Background"
        description="On-device client AI segmentation to isolate subjects and export transparent PNGs."
      />

      <EmptyState
        icon={Sparkles}
        title="Select an image for background removal"
        description="Pick a photo from your library to segment the subject on-device without server transmission."
        action={{
          label: "Choose from Library",
          onClick: () => {},
          icon: FolderOpen,
        }}
      />
    </div>
  );
};
