import { db } from './db';
import { ImageAsset, AssetFilter, VariantType } from '@/types';
import { generateThumbnail } from '@/utils/imageThumbnail';

// In-memory URL cache to prevent repetitive Object URL generation and memory leaks
const urlCache = new Map<string, string>();

export function getCachedThumbnailUrl(assetId: string, blob: Blob): string {
  if (urlCache.has(assetId)) {
    return urlCache.get(assetId)!;
  }
  const url = URL.createObjectURL(blob);
  urlCache.set(assetId, url);
  return url;
}

export function revokeAssetUrl(assetId: string): void {
  if (urlCache.has(assetId)) {
    URL.revokeObjectURL(urlCache.get(assetId)!);
    urlCache.delete(assetId);
  }
}

export const assetService = {
  /**
   * Upload and process a new image file into the library/project.
   */
  async createAsset(
    file: File,
    projectId: string | null = null,
    folderId: string | null = null
  ): Promise<ImageAsset> {
    const id = crypto.randomUUID();
    const now = Date.now();

    // Generate thumbnail & extract dimensions
    const { width, height, thumbnailBlob } = await generateThumbnail(file);

    const asset: ImageAsset = {
      id,
      filename: file.name,
      mimeType: file.type || 'image/png',
      originalSize: file.size,
      currentSize: file.size,
      width,
      height,
      createdAt: now,
      updatedAt: now,
      projectId: projectId || null,
      folderId: folderId || null,
      tags: [],
      isFavorite: false,
      isTrash: false,
      deletedAt: null,
      originalAssetId: null,
      rootAssetId: id,
      version: 1,
      operationNote: 'Original image uploaded',
      toolId: 'upload',
      variantType: null,
      variantMeta: null,
      thumbnailBlobId: id,
    };

    // Store in IndexedDB inside a single atomic transaction
    await db.transaction('rw', [db.assets, db.assetBlobs, db.thumbnailBlobs], async () => {
      await db.assets.add(asset);
      await db.assetBlobs.add({ id, blob: file, mimeType: asset.mimeType });
      await db.thumbnailBlobs.add({ id, blob: thumbnailBlob });
    });

    return asset;
  },

  /**
   * Fetch asset metadata by ID.
   */
  async getAsset(id: string): Promise<ImageAsset | undefined> {
    return db.assets.get(id);
  },

  /**
   * Fetch raw full-resolution image Blob.
   */
  async getAssetBlob(id: string): Promise<Blob | undefined> {
    const record = await db.assetBlobs.get(id);
    return record?.blob;
  },

  /**
   * Fetch thumbnail Blob.
   */
  async getThumbnailBlob(id: string): Promise<Blob | undefined> {
    const record = await db.thumbnailBlobs.get(id);
    return record?.blob;
  },

  /**
   * Get an object URL for the thumbnail.
   */
  async getThumbnailUrl(id: string): Promise<string | undefined> {
    if (urlCache.has(id)) {
      return urlCache.get(id);
    }
    const blob = await this.getThumbnailBlob(id);
    if (!blob) return undefined;
    return getCachedThumbnailUrl(id, blob);
  },

  /**
   * List assets with query filtering and sorting.
   */
  async listAssets(filter: AssetFilter = {}): Promise<ImageAsset[]> {
    let collection = db.assets.toCollection();

    // Apply trash filtering
    if (filter.isTrash !== undefined) {
      collection = collection.filter((a) => a.isTrash === filter.isTrash);
    } else {
      // Default: exclude trashed items
      collection = collection.filter((a) => !a.isTrash);
    }

    if (filter.projectId !== undefined) {
      collection = collection.filter((a) => a.projectId === filter.projectId);
    }

    if (filter.folderId !== undefined) {
      collection = collection.filter((a) => a.folderId === filter.folderId);
    }

    if (filter.isFavorite !== undefined) {
      collection = collection.filter((a) => a.isFavorite === filter.isFavorite);
    }

    if (filter.mimeType) {
      collection = collection.filter((a) => a.mimeType.includes(filter.mimeType!));
    }

    if (filter.variantType) {
      collection = collection.filter((a) => a.variantType === filter.variantType);
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      collection = collection.filter(
        (a) => a.filename.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const results = await collection.toArray();

    // In-memory sorting
    switch (filter.sortBy) {
      case 'date-asc':
        results.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'name-asc':
        results.sort((a, b) => a.filename.localeCompare(b.filename));
        break;
      case 'name-desc':
        results.sort((a, b) => b.filename.localeCompare(a.filename));
        break;
      case 'size-desc':
        results.sort((a, b) => b.currentSize - a.currentSize);
        break;
      case 'size-asc':
        results.sort((a, b) => a.currentSize - b.currentSize);
        break;
      case 'dims-desc':
        results.sort((a, b) => b.width * b.height - a.width * a.height);
        break;
      case 'date-desc':
      default:
        results.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return results;
  },

  /**
   * Update asset metadata.
   */
  async updateAsset(id: string, patch: Partial<ImageAsset>): Promise<void> {
    await db.assets.update(id, {
      ...patch,
      updatedAt: Date.now(),
    });
  },

  /**
   * Toggle favorite status.
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const asset = await db.assets.get(id);
    if (!asset) return false;
    const next = !asset.isFavorite;
    await db.assets.update(id, { isFavorite: next, updatedAt: Date.now() });
    return next;
  },

  /**
   * Soft-delete asset (move to Trash).
   */
  async softDeleteAsset(id: string): Promise<void> {
    await db.assets.update(id, {
      isTrash: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },

  /**
   * Restore asset from Trash.
   */
  async restoreAsset(id: string): Promise<void> {
    await db.assets.update(id, {
      isTrash: false,
      deletedAt: null,
      updatedAt: Date.now(),
    });
  },

  /**
   * Permanently delete asset and free binary storage.
   */
  async permanentlyDeleteAsset(id: string): Promise<void> {
    revokeAssetUrl(id);
    await db.transaction('rw', [db.assets, db.assetBlobs, db.thumbnailBlobs], async () => {
      await db.assets.delete(id);
      await db.assetBlobs.delete(id);
      await db.thumbnailBlobs.delete(id);
    });
  },

  /**
   * Duplicate an asset creating a new reference and record.
   */
  async duplicateAsset(id: string): Promise<ImageAsset | undefined> {
    const original = await db.assets.get(id);
    const originalBlob = await this.getAssetBlob(id);
    const thumbBlob = await this.getThumbnailBlob(id);

    if (!original || !originalBlob || !thumbBlob) return undefined;

    const newId = crypto.randomUUID();
    const now = Date.now();
    const ext = original.filename.includes('.') ? original.filename.substring(original.filename.lastIndexOf('.')) : '';
    const base = original.filename.replace(ext, '');
    const newFilename = `${base} (Copy)${ext}`;

    const newAsset: ImageAsset = {
      ...original,
      id: newId,
      filename: newFilename,
      createdAt: now,
      updatedAt: now,
      thumbnailBlobId: newId,
    };

    await db.transaction('rw', [db.assets, db.assetBlobs, db.thumbnailBlobs], async () => {
      await db.assets.add(newAsset);
      await db.assetBlobs.add({ id: newId, blob: originalBlob, mimeType: original.mimeType });
      await db.thumbnailBlobs.add({ id: newId, blob: thumbBlob });
    });

    return newAsset;
  },

  /**
   * Save a processed image resulting from a tool operation as a derived library asset.
   */
  async saveProcessedImage(
    derivedFromId: string | null,
    blob: Blob,
    variantType: VariantType,
    meta: Record<string, unknown> = {},
    projectId: string | null = null,
    customFilename?: string,
    operationNote?: string,
    toolId?: string
  ): Promise<ImageAsset> {
    const id = crypto.randomUUID();
    const now = Date.now();

    const parent = derivedFromId ? await db.assets.get(derivedFromId) : null;
    const baseName = parent ? parent.filename.replace(/\.[^/.]+$/, '') : 'processed-image';

    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const extension = extMap[blob.type] || '.png';
    const filename = customFilename || `${baseName}-${variantType}${extension}`;

    const { width, height, thumbnailBlob } = await generateThumbnail(blob);

    const rootAssetId = parent ? (parent.rootAssetId || parent.originalAssetId || parent.id) : id;
    const version = parent ? ((parent.version || 1) + 1) : 1;

    let defaultNote = operationNote;
    if (!defaultNote) {
      if (variantType === 'compressed') {
        defaultNote = `Compressed with quality ${meta?.quality ?? 'auto'}`;
      } else if (variantType === 'resized') {
        defaultNote = `Resized to ${width}×${height}px`;
      } else if (variantType === 'cropped') {
        defaultNote = `Cropped to ${width}×${height}px`;
      } else if (variantType === 'bg-removed') {
        defaultNote = 'Neural AI background removed';
      } else if (variantType === 'watermarked') {
        defaultNote = 'Applied watermark signature';
      } else if (variantType === 'blurred') {
        defaultNote = 'Applied blur privacy protection';
      } else if (variantType === 'converted') {
        defaultNote = `Converted to ${blob.type.replace('image/', '').toUpperCase()}`;
      } else {
        defaultNote = `Applied ${variantType} transformation`;
      }
    }

    const asset: ImageAsset = {
      id,
      filename,
      mimeType: blob.type || 'image/png',
      originalSize: parent ? parent.originalSize : blob.size,
      currentSize: blob.size,
      width,
      height,
      createdAt: now,
      updatedAt: now,
      projectId: projectId !== undefined ? projectId : (parent ? parent.projectId : null),
      folderId: parent ? parent.folderId : null,
      tags: parent ? Array.from(new Set([...parent.tags, variantType])) : [variantType],
      isFavorite: false,
      isTrash: false,
      deletedAt: null,
      originalAssetId: derivedFromId,
      rootAssetId,
      version,
      operationNote: defaultNote,
      toolId: toolId || variantType,
      variantType,
      variantMeta: meta,
      thumbnailBlobId: id,
    };

    await db.transaction('rw', [db.assets, db.assetBlobs, db.thumbnailBlobs], async () => {
      await db.assets.add(asset);
      await db.assetBlobs.add({ id, blob: blob, mimeType: asset.mimeType });
      await db.thumbnailBlobs.add({ id, blob: thumbnailBlob });
    });

    return asset;
  },

  /**
   * Retrieve full lineage / version history of an asset (original + all derived transformations).
   */
  async getAssetHistory(assetId: string): Promise<ImageAsset[]> {
    const current = await db.assets.get(assetId);
    if (!current) return [];

    const rootId = current.rootAssetId || current.originalAssetId || current.id;

    // Fetch all assets that belong to this lineage
    const all = await db.assets
      .filter((a) => !a.isTrash && (a.id === rootId || a.rootAssetId === rootId || a.originalAssetId === rootId))
      .toArray();

    // Sort chronologically
    all.sort((a, b) => (a.version ?? 1) - (b.version ?? 1) || a.createdAt - b.createdAt);

    // If current was somehow not included, include it
    if (!all.some((a) => a.id === current.id)) {
      all.push(current);
    }

    return all;
  },

  /**
   * Restore an earlier version as a new head in the lineage.
   */
  async restoreAssetVersion(targetVersionId: string): Promise<ImageAsset> {
    const target = await db.assets.get(targetVersionId);
    if (!target) {
      throw new Error('Version asset not found');
    }

    const blob = await this.getAssetBlob(targetVersionId);
    if (!blob) {
      throw new Error('Asset binary data not found');
    }

    const note = `Restored from v${target.version ?? 1} (${target.filename})`;
    return this.saveProcessedImage(
      targetVersionId,
      blob,
      target.variantType || 'other',
      { restoredFromVersion: target.version ?? 1, restoredFromId: targetVersionId },
      target.projectId,
      undefined,
      note,
      'restore'
    );
  },
};

