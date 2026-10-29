import { assetService } from '@/services/storage/assetService';
import { zipSync } from 'fflate';

export const downloadService = {
  /**
   * Triggers download of a raw blob.
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /**
   * Downloads an asset by its ID.
   */
  async downloadAsset(id: string, customFilename?: string): Promise<void> {
    const asset = await assetService.getAsset(id);
    const blob = await assetService.getAssetBlob(id);
    if (!asset || !blob) {
      throw new Error('Asset or image data not found');
    }
    this.downloadBlob(blob, customFilename || asset.filename);
  },

  /**
   * Packages multiple assets into a single .zip file client-side using fflate.
   */
  async downloadBatchAsZip(assetIds: string[], zipName = 'workspace-images.zip'): Promise<void> {
    const zipData: Record<string, Uint8Array> = {};

    for (const id of assetIds) {
      const asset = await assetService.getAsset(id);
      const blob = await assetService.getAssetBlob(id);
      if (asset && blob) {
        const arrayBuf = await blob.arrayBuffer();
        // Prevent duplicate filename collision inside zip
        let filename = asset.filename;
        let counter = 1;
        while (zipData[filename]) {
          const extIdx = asset.filename.lastIndexOf('.');
          const base = extIdx > -1 ? asset.filename.substring(0, extIdx) : asset.filename;
          const ext = extIdx > -1 ? asset.filename.substring(extIdx) : '';
          filename = `${base} (${counter})${ext}`;
          counter++;
        }
        zipData[filename] = new Uint8Array(arrayBuf);
      }
    }

    const zipped = zipSync(zipData);
    const zipBlob = new Blob([zipped as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
    this.downloadBlob(zipBlob, zipName);
  },
};
