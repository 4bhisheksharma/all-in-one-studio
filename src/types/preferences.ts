export type ViewMode = 'grid' | 'list';

export interface UserPreferences {
  id: string; // 'user_preferences'
  theme: 'dark';
  defaultFormat: 'image/webp' | 'image/jpeg' | 'image/png';
  defaultQuality: number;
  sidebarCollapsed: boolean;
  viewMode: ViewMode;
  autoSaveDrafts: boolean;
}
