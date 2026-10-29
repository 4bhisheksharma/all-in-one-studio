import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { EyeOff, FolderOpen } from 'lucide-react';

export const FaceBlurPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Face & Region Blur"
        description="Conceal faces, license plates, or sensitive documents using interactive blur and pixelation boxes."
      />

      <EmptyState
        icon={EyeOff}
        title="Select an image to blur"
        description="Load an image from your library to draw custom blur rectangles or run face detection."
        action={{
          label: "Choose from Library",
          onClick: () => {},
          icon: FolderOpen,
        }}
      />
    </div>
  );
};
