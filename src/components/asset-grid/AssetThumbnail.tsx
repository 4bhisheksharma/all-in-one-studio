import React, { useEffect, useState } from 'react';
import { assetService } from '@/services/storage/assetService';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AssetThumbnailProps {
  assetId: string;
  alt: string;
  className?: string;
}

export const AssetThumbnail: React.FC<AssetThumbnailProps> = ({ assetId, alt, className }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    assetService.getThumbnailUrl(assetId).then((url) => {
      if (active) {
        setThumbUrl(url || null);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [assetId]);

  if (loading) {
    return (
      <div className={cn('w-full h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center text-zinc-400 dark:text-zinc-600', className)}>
        <ImageIcon className="w-5 h-5 opacity-40" />
      </div>
    );
  }

  if (!thumbUrl) {
    return (
      <div className={cn('w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-600', className)}>
        <ImageIcon className="w-5 h-5" />
      </div>
    );
  }

  return (
    <img
      src={thumbUrl}
      alt={alt}
      loading="lazy"
      className={cn('w-full h-full object-cover transition-transform duration-200 group-hover:scale-105', className)}
    />
  );
};
