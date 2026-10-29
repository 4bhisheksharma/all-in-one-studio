import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';

import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage';
import { RecentFilesPage } from '@/features/recent/RecentFilesPage';
import { FavoritesPage } from '@/features/favorites/FavoritesPage';
import { DraftsPage } from '@/features/drafts/DraftsPage';
import { TrashPage } from '@/features/trash/TrashPage';

import { CompressorPage } from '@/features/compressor/CompressorPage';
import { ResizerPage } from '@/features/resizer/ResizerPage';
import { CropperPage } from '@/features/cropper/CropperPage';
import { CollagePage } from '@/features/collage/CollagePage';
import { BackgroundRemoverPage } from '@/features/background-remover/BackgroundRemoverPage';
import { FaceBlurPage } from '@/features/face-blur/FaceBlurPage';
import { ConverterPage } from '@/features/converter/ConverterPage';
import { UtilitiesPage } from '@/features/utilities/UtilitiesPage';
import { CanvasStudioPage } from '@/features/canvas-studio/CanvasStudioPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'recent', element: <RecentFilesPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'drafts', element: <DraftsPage /> },
      { path: 'trash', element: <TrashPage /> },

      { path: 'canvas', element: <CanvasStudioPage /> },
      { path: 'tools/canvas', element: <CanvasStudioPage /> },
      { path: 'tools/compress', element: <CompressorPage /> },
      { path: 'tools/resize', element: <ResizerPage /> },
      { path: 'tools/crop', element: <CropperPage /> },
      { path: 'tools/collage', element: <CollagePage /> },
      { path: 'tools/background-remove', element: <BackgroundRemoverPage /> },
      { path: 'tools/face-blur', element: <FaceBlurPage /> },
      { path: 'tools/convert', element: <ConverterPage /> },
      { path: 'tools/utilities', element: <UtilitiesPage /> },

      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
});
