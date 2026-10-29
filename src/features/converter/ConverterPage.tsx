import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { RefreshCw, FolderOpen } from 'lucide-react';

export const ConverterPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Format Converter"
        description="Single and batch format conversion between WebP, PNG, and JPEG with client-side ZIP export."
      />

      <EmptyState
        icon={RefreshCw}
        title="Select images to convert"
        description="Pick one or multiple images from your library to convert formats in batch."
        action={{
          label: "Choose from Library",
          onClick: () => {},
          icon: FolderOpen,
        }}
      />
    </div>
  );
};
