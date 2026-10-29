import { create } from 'zustand';
import { Project, Folder } from '@/types';
import { projectService } from '@/services/storage/projectService';

interface ProjectStoreState {
  projects: Project[];
  folders: Folder[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  fetchFolders: (projectId: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  createProject: (name: string, description?: string) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string, deleteAssets?: boolean) => Promise<void>;
  createFolder: (projectId: string, name: string, parentId?: string | null) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  folders: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const items = await projectService.listProjects();
      set({ projects: items, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load projects',
      });
    }
  },

  fetchFolders: async (projectId: string) => {
    try {
      const items = await projectService.listFolders(projectId);
      set({ folders: items });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load folders',
      });
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  createProject: async (name, description) => {
    const project = await projectService.createProject(name, description);
    await get().fetchProjects();
    return project;
  },

  updateProject: async (id, patch) => {
    await projectService.updateProject(id, patch);
    await get().fetchProjects();
  },

  deleteProject: async (id, deleteAssets = false) => {
    await projectService.deleteProject(id, deleteAssets);
    await get().fetchProjects();
  },

  createFolder: async (projectId, name, parentId = null) => {
    const folder = await projectService.createFolder(projectId, name, parentId);
    await get().fetchFolders(projectId);
    return folder;
  },

  deleteFolder: async (id) => {
    await projectService.deleteFolder(id);
    const curr = get().currentProject;
    if (curr) {
      await get().fetchFolders(curr.id);
    }
  },
}));
