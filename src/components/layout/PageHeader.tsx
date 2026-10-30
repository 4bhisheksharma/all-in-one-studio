import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  badge,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-[#22222a]">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
