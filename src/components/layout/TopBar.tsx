import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, UploadCloud, ChevronRight, Home, ShieldCheck } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

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
  'utilities': 'Utilities Suite',
  'settings': 'Settings',
};

export const TopBar: React.FC = () => {
  const { setMobileDrawerOpen, setActiveUploadModal } = useUIStore();
  const location = useLocation();

  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <header className="h-16 px-4 md:px-6 bg-[#111115]/80 backdrop-blur-md border-b border-[#22222a] flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-zinc-200 transition-colors p-1 rounded"
          >
            <Home className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Workspace</span>
          </Link>

          {pathSegments.map((segment, index) => {
            const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
            const isLast = index === pathSegments.length - 1;
            const label = ROUTE_LABELS[segment] || segment;

            return (
              <React.Fragment key={path}>
                <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
                {isLast ? (
                  <span className="font-semibold text-zinc-200">{label}</span>
                ) : (
                  <Link
                    to={path}
                    className="hover:text-zinc-200 transition-colors capitalize truncate max-w-[120px]"
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
      <div className="flex items-center gap-3">
        {/* Privacy badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
          <span>Local Client Processing</span>
        </div>

        {/* Global Upload Button */}
        <button
          onClick={() => setActiveUploadModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-lime-400 hover:bg-lime-300 text-black font-semibold text-xs rounded-lg shadow-sm transition-all duration-150 active:scale-95"
        >
          <UploadCloud className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Images</span>
        </button>
      </div>
    </header>
  );
};
