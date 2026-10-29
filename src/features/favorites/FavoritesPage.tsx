import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Star } from 'lucide-react';

export const FavoritesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Favorite Images"
        description="Your starred images across all projects and library folders."
      />

      <EmptyState
        icon={Star}
        title="No favorites yet"
        description="Click the star icon on any image card in your library to pin it here for rapid access."
      />
    </div>
  );
};
