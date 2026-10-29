export interface Project {
  id: string; // UUID
  name: string;
  description?: string;
  coverAssetId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string; // UUID
  projectId: string;
  name: string;
  parentId?: string | null;
  createdAt: number;
}
