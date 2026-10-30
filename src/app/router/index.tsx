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
import { RecipesPage } from '@/features/recipes/RecipesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { AppIconGeneratorPage } from '@/features/app-icons/AppIconGeneratorPage';
import { BatchQueuePage } from '@/features/batch-queue/BatchQueuePage';
import { SplitterPage } from '@/features/splitter/SplitterPage';
import { RenamerPage } from '@/features/renamer/RenamerPage';
import { MockupPage } from '@/features/mockups/MockupPage';
import { PixelAsciiPage } from '@/features/pixel-ascii/PixelAsciiPage';
import { OcrPage } from '@/features/ocr/OcrPage';
import { GifStudioPage } from '@/features/gif-studio/GifStudioPage';

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

      { path: 'batch-queue', element: <BatchQueuePage /> },
      { path: 'recipes', element: <RecipesPage /> },
      { path: 'tools/recipes', element: <RecipesPage /> },
      { path: 'canvas', element: <CanvasStudioPage /> },
      { path: 'tools/canvas', element: <CanvasStudioPage /> },
      { path: 'tools/app-icons', element: <AppIconGeneratorPage /> },
      { path: 'tools/compress', element: <CompressorPage /> },
      { path: 'tools/resize', element: <ResizerPage /> },
      { path: 'tools/crop', element: <CropperPage /> },
      { path: 'tools/collage', element: <CollagePage /> },
      { path: 'tools/background-remove', element: <BackgroundRemoverPage /> },
      { path: 'tools/face-blur', element: <FaceBlurPage /> },
      { path: 'tools/convert', element: <ConverterPage /> },
      { path: 'tools/splitter', element: <SplitterPage /> },
      { path: 'tools/split', element: <SplitterPage /> },
      { path: 'tools/renamer', element: <RenamerPage /> },
      { path: 'renamer', element: <RenamerPage /> },
      { path: 'tools/mockups', element: <MockupPage /> },
      { path: 'mockups', element: <MockupPage /> },
      { path: 'tools/pixel-ascii', element: <PixelAsciiPage /> },
      { path: 'pixel-ascii', element: <PixelAsciiPage /> },
      { path: 'tools/ocr', element: <OcrPage /> },
      { path: 'ocr', element: <OcrPage /> },
      { path: 'tools/gif-studio', element: <GifStudioPage /> },
      { path: 'gif-studio', element: <GifStudioPage /> },
      { path: 'tools/utilities', element: <UtilitiesPage /> },

      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
});
