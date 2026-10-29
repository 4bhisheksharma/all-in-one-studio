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
