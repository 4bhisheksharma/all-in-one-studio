import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Minimize2, FolderOpen } from 'lucide-react';

export const CompressorPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Image Compressor"
        description="Lossy and lossless client-side compression for WebP, JPEG, and PNG formats."
      />

      <EmptyState
        icon={Minimize2}
        title="Select an image to compress"
        description="Pick an existing image from your project library or upload a new photo directly into this tool."
        action={{
          label: "Choose from Library",
          onClick: () => {},
          icon: FolderOpen,
        }}
      />
    </div>
  );
};
