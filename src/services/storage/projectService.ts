import { db } from './db';
import { Project, Folder } from '@/types';

export const projectService = {
  /**
   * Create a new project.
   */
  async createProject(name: string, description?: string): Promise<Project> {
    const id = crypto.randomUUID();
    const now = Date.now();

    const project: Project = {
      id,
      name: name.trim(),
      description: description?.trim() || '',
      coverAssetId: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.projects.add(project);
    return project;
  },

  /**
   * Fetch project by ID.
   */
  async getProject(id: string): Promise<Project | undefined> {
    return db.projects.get(id);
  },

  /**
   * List all projects ordered by most recently updated.
   */
  async listProjects(): Promise<Project[]> {
    return db.projects.orderBy('updatedAt').reverse().toArray();
  },

  /**
   * Update project metadata.
   */
  async updateProject(id: string, patch: Partial<Project>): Promise<void> {
    await db.projects.update(id, {
      ...patch,
      updatedAt: Date.now(),
    });
  },

  /**
   * Delete a project. Optionally unassign or soft-delete its assets.
   */
  async deleteProject(id: string, deleteAssets = false): Promise<void> {
    await db.transaction('rw', [db.projects, db.folders, db.assets], async () => {
      await db.projects.delete(id);
      await db.folders.where('projectId').equals(id).delete();

      if (deleteAssets) {
        const assets = await db.assets.where('projectId').equals(id).toArray();
        for (const a of assets) {
          await db.assets.update(a.id, { isTrash: true, deletedAt: Date.now() });
        }
      } else {
        // Unassign assets so they move to general unorganized library
        const assets = await db.assets.where('projectId').equals(id).toArray();
        for (const a of assets) {
          await db.assets.update(a.id, { projectId: null, folderId: null });
        }
      }
    });
  },

  /**
   * Create a folder inside a project.
   */
  async createFolder(projectId: string, name: string, parentId: string | null = null): Promise<Folder> {
    const id = crypto.randomUUID();
    const folder: Folder = {
      id,
      projectId,
      name: name.trim(),
      parentId: parentId || null,
      createdAt: Date.now(),
    };
    await db.folders.add(folder);
    return folder;
  },

  /**
   * List all folders in a project.
   */
  async listFolders(projectId: string): Promise<Folder[]> {
    return db.folders.where('projectId').equals(projectId).toArray();
  },

  /**
   * Delete a folder and unassign its child assets.
   */
  async deleteFolder(id: string): Promise<void> {
    await db.transaction('rw', [db.folders, db.assets], async () => {
      await db.folders.delete(id);
      const assets = await db.assets.where('folderId').equals(id).toArray();
      for (const a of assets) {
        await db.assets.update(a.id, { folderId: null });
      }
    });
  },

  /**
   * Move an asset to a project/folder.
   */
  async moveAsset(assetId: string, projectId: string | null, folderId: string | null = null): Promise<void> {
    await db.assets.update(assetId, {
      projectId: projectId || null,
      folderId: folderId || null,
      updatedAt: Date.now(),
    });
  },

  /**
   * Move multiple assets in batch.
   */
  async batchMoveAssets(assetIds: string[], projectId: string | null, folderId: string | null = null): Promise<void> {
    await db.transaction('rw', db.assets, async () => {
      for (const id of assetIds) {
        await db.assets.update(id, {
          projectId: projectId || null,
          folderId: folderId || null,
          updatedAt: Date.now(),
        });
      }
    });
  },
};
