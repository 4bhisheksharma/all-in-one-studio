import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Sliders, FolderOpen } from 'lucide-react';

export const UtilitiesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Image Utilities Suite"
        description="EXIF metadata inspector, color eyedropper, dominant palette generator, watermarking, and favicons."
      />

      <EmptyState
        icon={Sliders}
        title="Select an image for utility processing"
        description="Choose any image from your workspace library to inspect metadata, extract colors, or generate icons."
        action={{
          label: "Choose from Library",
          onClick: () => {},
          icon: FolderOpen,
        }}
      />
    </div>
  );
};
