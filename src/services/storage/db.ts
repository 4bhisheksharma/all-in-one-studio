import Dexie, { type EntityTable } from 'dexie';
import { ImageAsset, Project, Folder, EditorDraft, UserPreferences } from '@/types';

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
  }
}

export const db = new ImagoDatabase();
