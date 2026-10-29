import { useState } from 'react';
import { toast } from 'sonner';
import { assetService } from '@/services/storage/assetService';
import { useAssetStore } from '@/stores/assetStore';
import { useUIStore } from '@/stores/uiStore';
import { ImageAsset } from '@/types';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { fetchAssets } = useAssetStore();
  const { setStorageStats } = useUIStore();

  const uploadFiles = async (
    files: File[] | FileList,
    projectId: string | null = null,
    folderId: string | null = null
  ): Promise<ImageAsset[]> => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return [];

    setUploading(true);
    setProgress({ current: 0, total: fileList.length });

    const createdAssets: ImageAsset[] = [];
    const errors: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Validate format
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        errors.push(`${file.name}: Unsupported image format (${file.type || 'unknown'})`);
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Exceeds 50MB limit`);
        continue;
      }

      try {
        const asset = await assetService.createAsset(file, projectId, folderId);
        createdAssets.push(asset);
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`);
      }

      setProgress({ current: i + 1, total: fileList.length });
    }

    // Refresh UI
    await fetchAssets();

    // Refresh storage stats
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      setStorageStats(usage || 0, quota || 0);
    }

    setUploading(false);

    if (createdAssets.length > 0) {
      toast.success(
        `Successfully added ${createdAssets.length} image${createdAssets.length > 1 ? 's' : ''} to workspace`
      );
    }

    if (errors.length > 0) {
      toast.error(`Failed to process ${errors.length} file(s): ${errors[0]}`);
    }

    return createdAssets;
  };

  return {
    uploadFiles,
    uploading,
    progress,
  };
}
