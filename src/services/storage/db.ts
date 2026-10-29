import Dexie, { type EntityTable, type Table } from 'dexie';
import { ImageAsset, Project, Folder, EditorDraft, UserPreferences, SmartCollection } from '@/types';
import { ImageRecipe } from '@/features/recipes/types';

export interface AssetBlobRecord {
  id: string; // matches ImageAsset.id
  blob: Blob;
  mimeType: string;
}

export interface ThumbnailBlobRecord {
  id: string; // matches ImageAsset.id
  blob: Blob;
}

export class ImagoDatabase extends Dexie {
  assets!: EntityTable<ImageAsset, 'id'>;
  assetBlobs!: EntityTable<AssetBlobRecord, 'id'>;
  thumbnailBlobs!: EntityTable<ThumbnailBlobRecord, 'id'>;
  projects!: EntityTable<Project, 'id'>;
  folders!: EntityTable<Folder, 'id'>;
  drafts!: EntityTable<EditorDraft, 'id'>;
  preferences!: EntityTable<UserPreferences, 'id'>;
  recipes!: Table<ImageRecipe, string>;
  smartCollections!: Table<SmartCollection, string>;

  constructor() {
    super('imago_workspace_db');

    this.version(1).stores({
      assets: 'id, projectId, folderId, isTrash, isFavorite, createdAt, updatedAt, mimeType, filename, originalAssetId, variantType',
      assetBlobs: 'id',
      thumbnailBlobs: 'id',
      projects: 'id, createdAt, updatedAt, name',
      folders: 'id, projectId, parentId, createdAt',
      drafts: 'id, toolType, projectId, updatedAt',
      preferences: 'id',
    });

    this.version(2).stores({
      recipes: 'id, name, category, createdAt, updatedAt',
    });

    this.version(3).stores({
      assets: 'id, projectId, folderId, isTrash, isFavorite, createdAt, updatedAt, mimeType, filename, originalAssetId, rootAssetId, variantType',
      smartCollections: 'id, name, createdAt, updatedAt',
    });
  }
}

export const db = new ImagoDatabase();
