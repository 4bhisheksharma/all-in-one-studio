import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { useUpload } from '@/hooks/useUpload';
import { cn } from '@/utils/cn';

interface UploadDropzoneProps {
  projectId?: string | null;
  folderId?: string | null;
  onUploadComplete?: () => void;
  className?: string;
  compact?: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  projectId = null,
  folderId = null,
  onUploadComplete,
  className,
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles, uploading, progress } = useUpload();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files, projectId, folderId);
      if (onUploadComplete) onUploadComplete();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(e.target.files, projectId, folderId);
      if (onUploadComplete) onUploadComplete();
      // Reset input value so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !uploading && fileInputRef.current?.click()}
      className={cn(
        'group relative border border-dashed rounded-xl transition-all duration-150 cursor-pointer flex flex-col items-center justify-center text-center select-none',
        isDragOver
          ? 'border-zinc-900 bg-zinc-100/70 dark:border-zinc-100 dark:bg-zinc-800/40'
          : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-100/50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:bg-[#111115]/50 dark:hover:bg-[#141418]',
        compact ? 'p-6' : 'p-8 sm:p-12',
        uploading && 'cursor-wait pointer-events-none opacity-80',
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-zinc-900 dark:text-zinc-100 animate-spin" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
              Processing & Saving Images...
            </p>
            <p className="text-[11px] text-zinc-500 font-mono">
              {progress.current} of {progress.total} completed
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center text-zinc-600 dark:text-zinc-400 mb-3 transition-colors shadow-xs',
              compact ? 'w-9 h-9' : 'w-11 h-11'
            )}
          >
            {isDragOver ? (
              <ImageIcon className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            ) : (
              <UploadCloud className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              <span className="text-zinc-950 dark:text-zinc-100 underline underline-offset-2">Click to upload</span> or drag and drop images
            </p>
            <p className="text-[11px] text-zinc-500">
              PNG, JPG, WebP, GIF, or SVG (up to 50MB per file)
            </p>
          </div>

          <div className="mt-3.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Stored locally in browser IndexedDB</span>
          </div>
        </>
      )}
    </div>
  );
};
