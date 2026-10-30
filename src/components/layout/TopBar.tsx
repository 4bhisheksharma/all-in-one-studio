import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, UploadCloud, ChevronRight, Home, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { toggleThemeWithAnimation } from '@/utils/themeTransition';

const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  'library': 'All Images',
  'projects': 'Projects',
  'recent': 'Recent Files',
  'favorites': 'Favorites',
  'drafts': 'Drafts',
  'trash': 'Trash',
  'recipes': 'Smart Recipes',
  'canvas': 'Studio Canvas',
  'tools': 'Tools',
  'compress': 'Compressor',
  'resize': 'Resizer',
  'crop': 'Cropper',
  'collage': 'Collage Maker',
  'background-remove': 'Remove Background',
  'face-blur': 'Face & Region Blur',
  'convert': 'Converter',
  'splitter': 'Image Splitter & Slicer',
  'renamer': 'Bulk File Renamer',
  'mockups': 'Device Frame & Mockup Studio',
  'pixel-ascii': 'Pixel Art & ASCII Studio',
  'ocr': 'OCR & Document Scanner',
  'gif-studio': 'Animated GIF Studio',
  'utilities': 'Utilities Suite',
  'settings': 'Settings',
};

export const TopBar: React.FC = () => {
  const { setMobileDrawerOpen, setActiveUploadModal, theme } = useUIStore();
  const location = useLocation();

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <header className="h-14 px-4 md:px-6 bg-white/90 dark:bg-[#0e0e11]/90 backdrop-blur-md border-b border-zinc-200 dark:border-[#22222a] flex items-center justify-between sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle & brand */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="w-6 h-6 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0">
            <img src={`${import.meta.env.BASE_URL}imago-logo.png`} alt="Logo" className="w-full h-full object-cover" />
          </Link>
        </div>

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors p-1 rounded"
          >
            <Home className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <span className="hidden sm:inline">Workspace</span>
          </Link>

          {pathSegments.map((segment, index) => {
            const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
            const isLast = index === pathSegments.length - 1;
            const label = ROUTE_LABELS[segment] || segment;

            return (
              <React.Fragment key={path}>
                <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-zinc-600 shrink-0" />
                {isLast ? (
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
                ) : (
                  <Link
                    to={path}
                    className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors capitalize truncate max-w-[120px]"
                  >
                    {label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Privacy badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Local Client Processing</span>
        </div>

        {/* Theme Switcher Toggle with Circular Reveal Animation */}
        <button
          onClick={(e) => toggleThemeWithAnimation(e.currentTarget)}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700/50"
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Global Upload Button */}
        <button
          onClick={() => setActiveUploadModal(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs rounded-lg shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload Images</span>
        </button>
      </div>
    </header>
  );
};

