export type VariantType =
  | 'compressed'
  | 'resized'
  | 'cropped'
  | 'converted'
  | 'collage'
  | 'bg-removed'
  | 'blurred'
  | 'watermarked'
  | 'favicon'
  | 'other';

export interface ImageAsset {
  id: string; // UUID
  filename: string;
  mimeType: string;
  originalSize: number; // bytes
  currentSize: number; // bytes
  width: number;
  height: number;
  createdAt: number; // timestamp ms
  updatedAt: number; // timestamp ms
  projectId: string | null;
  folderId: string | null;
  tags: string[];
  isFavorite: boolean;
  isTrash: boolean;
  deletedAt: number | null;
  originalAssetId: string | null; // null for originals, parent id for derived
  rootAssetId?: string | null; // ID of the root original asset
  version?: number; // 1 for original, 2, 3... for derived transformations
  operationNote?: string; // e.g. "Resized to 1200x800", "Compressed with WebP 80%"
  toolId?: string; // identifier of the tool or recipe that created this version
  variantType: VariantType | null;
  variantMeta: Record<string, unknown> | null;
  thumbnailBlobId: string | null;
  notes?: string;
}

export type AssetSortOption =
  | 'date-desc'
  | 'date-asc'
  | 'name-asc'
  | 'name-desc'
  | 'size-desc'
  | 'size-asc'
  | 'dims-desc';

export interface AssetFilter {
  projectId?: string | null;
  folderId?: string | null;
  mimeType?: string;
  isFavorite?: boolean;
  isTrash?: boolean;
  search?: string;
  variantType?: VariantType;
  sortBy?: AssetSortOption;
}
