import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label,
  className,
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 gap-3 text-zinc-400', className)}>
      <Loader2 className={cn('animate-spin text-lime-400', sizeMap[size])} />
      {label && <p className="text-xs text-zinc-400 font-medium">{label}</p>}
    </div>
  );
};
