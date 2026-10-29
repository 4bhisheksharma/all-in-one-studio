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
        'group relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center select-none',
        isDragOver
          ? 'border-lime-400 bg-lime-400/5 shadow-[0_0_20px_rgba(163,230,53,0.15)] scale-[1.005]'
          : 'border-[#2c2c38] hover:border-zinc-500 bg-[#121217]/60 hover:bg-[#16161d]',
        compact ? 'p-6' : 'p-10 sm:p-14',
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
          <Loader2 className="w-10 h-10 text-lime-400 animate-spin" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-100">
              Processing & Saving Images...
            </p>
            <p className="text-xs text-zinc-400 font-mono">
              {progress.current} of {progress.total} completed
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 transition-transform group-hover:scale-105 group-hover:border-lime-400/50 group-hover:text-lime-400 shadow-inner',
              compact ? 'w-10 h-10' : 'w-14 h-14'
            )}
          >
            {isDragOver ? (
              <ImageIcon className="w-6 h-6 text-lime-400 animate-bounce" />
            ) : (
              <UploadCloud className={compact ? 'w-5 h-5' : 'w-7 h-7'} />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-200">
              <span className="text-lime-400 group-hover:underline">Click to upload</span> or drag and drop images
            </p>
            <p className="text-xs text-zinc-500">
              PNG, JPG, WebP, GIF, or SVG (up to 50MB per file)
            </p>
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Stored 100% locally in IndexedDB</span>
          </div>
        </>
      )}
    </div>
  );
};
