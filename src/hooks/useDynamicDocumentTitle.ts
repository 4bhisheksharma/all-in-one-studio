import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard - Imago Studio',
  '/library': 'All Images - Imago Studio',
  '/projects': 'Projects - Imago Studio',
  '/recent': 'Recent Files - Imago Studio',
  '/favorites': 'Favorites - Imago Studio',
  '/drafts': 'Drafts - Imago Studio',
  '/trash': 'Trash - Imago Studio',
  '/batch-queue': 'Batch Queue - Imago Studio',
  '/recipes': 'Smart Recipes - Imago Studio',
  '/tools/recipes': 'Smart Recipes - Imago Studio',
  '/canvas': 'Studio Canvas - Imago Studio',
  '/tools/canvas': 'Studio Canvas - Imago Studio',
  '/tools/app-icons': 'App Asset Generator - Imago Studio',
  '/tools/compress': 'Image Compressor - Imago Studio',
  '/tools/resize': 'Image Resizer - Imago Studio',
  '/tools/crop': 'Image Cropper - Imago Studio',
  '/tools/collage': 'Collage Maker - Imago Studio',
  '/tools/background-remove': 'Background Remover - Imago Studio',
  '/tools/face-blur': 'Face & Region Blur - Imago Studio',
  '/tools/convert': 'Format Converter - Imago Studio',
  '/tools/utilities': 'Utilities Suite - Imago Studio',
  '/settings': 'Settings & Storage - Imago Studio',
};

export const useDynamicDocumentTitle = (customTitle?: string) => {
  const location = useLocation();

  useEffect(() => {
    if (customTitle) {
      document.title = customTitle.includes('Imago Studio')
        ? customTitle
        : `${customTitle} - Imago Studio`;
      return;
    }

    const pathname = location.pathname;
    if (ROUTE_TITLES[pathname]) {
      document.title = ROUTE_TITLES[pathname];
      return;
    }

    if (pathname.startsWith('/projects/')) {
      document.title = 'Project Details - Imago Studio';
      return;
    }

    // Dynamic fallback based on path segments
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      const formatted = last
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      document.title = `${formatted} - Imago Studio`;
    } else {
      document.title = 'Imago Studio - Minimal Image Workspace';
    }
  }, [location.pathname, customTitle]);
};
