import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Crop, FolderOpen } from 'lucide-react';

export const CropperPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Image Cropper & Rotate"
        description="Crop to freeform or locked aspect ratios (16:9, 1:1, 4:3), rotate 90°, and flip."
      />

      <EmptyState
        icon={Crop}
        title="Select an image to crop"
        description="Choose an asset from your library to open the interactive canvas viewport."
        action={{
          label: "Choose from Library",
          onClick: () => {},
          icon: FolderOpen,
        }}
      />
    </div>
  );
};
