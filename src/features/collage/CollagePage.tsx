import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Layers, Plus } from 'lucide-react';

export const CollagePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Collage Maker"
        description="Select multiple images from your library and compose them into custom grid arrangements."
      />

      <EmptyState
        icon={Layers}
        title="Create a new collage composition"
        description="Choose 2 or more images from your library or upload them directly to arrange layouts."
        action={{
          label: "Select Images for Collage",
          onClick: () => {},
          icon: Plus,
        }}
      />
    </div>
  );
};
