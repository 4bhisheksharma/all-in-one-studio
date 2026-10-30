import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-10 border border-dashed border-zinc-300 dark:border-[#262630] rounded-xl bg-zinc-50/50 dark:bg-[#121216]/50 max-w-lg mx-auto my-8',
        className
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center text-zinc-500 dark:text-zinc-400 mb-3 shadow-xs">
        <Icon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs rounded-lg transition-all shadow-xs active:scale-[0.98] cursor-pointer"
        >
          {action.icon && <action.icon className="w-3.5 h-3.5" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
};
