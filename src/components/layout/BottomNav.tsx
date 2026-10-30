import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Images,
  Wand2,
  Layers,
  Wrench,
  X,
  Minimize2,
  Maximize2,
  Crop,
  Sparkles,
  EyeOff,
  RefreshCw,
  Sliders,
  FolderKanban,
  Star,
  ChevronRight,
  Smartphone,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const location = useLocation();

  const isToolActive =
    location.pathname.startsWith('/tools/') &&
    !location.pathname.includes('/canvas') &&
    !location.pathname.includes('/recipes');

  const tools = [
    { title: 'App Icon Generator', to: '/tools/app-icons', icon: Smartphone },
    { title: 'Batch Queue', to: '/batch-queue', icon: Layers },
    { title: 'Compressor', to: '/tools/compress', icon: Minimize2 },
    { title: 'Resizer', to: '/tools/resize', icon: Maximize2 },
    { title: 'Cropper', to: '/tools/crop', icon: Crop },
    { title: 'Collage Maker', to: '/tools/collage', icon: Layers },
    { title: 'Remove BG', to: '/tools/background-remove', icon: Sparkles },
    { title: 'Face & Blur', to: '/tools/face-blur', icon: EyeOff },
    { title: 'Converter', to: '/tools/convert', icon: RefreshCw },
    { title: 'Utilities Suite', to: '/tools/utilities', icon: Sliders },
    { title: 'Projects', to: '/projects', icon: FolderKanban },
    { title: 'Favorites', to: '/favorites', icon: Star },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0e0e11]/95 backdrop-blur-md border-t border-zinc-200 dark:border-[#22222a] shadow-lg px-2 pt-1 pb-[max(env(safe-area-inset-bottom,0px),8px)]"
      >
        <div className="flex items-center justify-around h-13 max-w-lg mx-auto">
          {/* 1. Home / Dashboard */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-all duration-150 interactive-press ${
                isActive ? 'text-zinc-950 dark:text-zinc-100 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard className={`w-5 h-5 transition-transform ${isActive ? 'scale-105' : ''}`} />
                <span className="mt-1">Home</span>
                {isActive && <span className="w-1 h-1 rounded-full bg-zinc-900 dark:bg-zinc-100 mt-0.5" />}
              </>
            )}
          </NavLink>

          {/* 2. Library */}
          <NavLink
            to="/library"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-all duration-150 interactive-press ${
                isActive ? 'text-zinc-950 dark:text-zinc-100 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Images className={`w-5 h-5 transition-transform ${isActive ? 'scale-105' : ''}`} />
                <span className="mt-1">Library</span>
                {isActive && <span className="w-1 h-1 rounded-full bg-zinc-900 dark:bg-zinc-100 mt-0.5" />}
              </>
            )}
          </NavLink>

          {/* 3. Smart Recipes (Automation) */}
          <NavLink
            to="/recipes"
            className={() => {
              const isActive = location.pathname === '/recipes' || location.pathname === '/tools/recipes';
              return `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-all duration-150 interactive-press ${
                isActive ? 'text-zinc-950 dark:text-zinc-100 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`;
            }}
          >
            {() => {
              const isActive = location.pathname === '/recipes' || location.pathname === '/tools/recipes';
              return (
                <>
                  <Wand2 className={`w-5 h-5 transition-transform ${isActive ? 'scale-105 text-zinc-950 dark:text-zinc-100' : ''}`} />
                  <span className="mt-1">Recipes</span>
                  {isActive && <span className="w-1 h-1 rounded-full bg-zinc-900 dark:bg-zinc-100 mt-0.5" />}
                </>
              );
            }}
          </NavLink>

          {/* 4. Studio Canvas */}
          <NavLink
            to="/canvas"
            className={() => {
              const isActive = location.pathname === '/canvas' || location.pathname === '/tools/canvas';
              return `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-all duration-150 interactive-press ${
                isActive ? 'text-zinc-950 dark:text-zinc-100 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`;
            }}
          >
            {() => {
              const isActive = location.pathname === '/canvas' || location.pathname === '/tools/canvas';
              return (
                <>
                  <Layers className={`w-5 h-5 transition-transform ${isActive ? 'scale-105' : ''}`} />
                  <span className="mt-1">Canvas</span>
                  {isActive && <span className="w-1 h-1 rounded-full bg-zinc-900 dark:bg-zinc-100 mt-0.5" />}
                </>
              );
            }}
          </NavLink>

          {/* 5. Tools Quick Launcher Sheet */}
          <button
            type="button"
            onClick={() => setToolsSheetOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-all duration-150 interactive-press ${
              isToolActive || toolsSheetOpen ? 'text-zinc-950 dark:text-zinc-100 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Wrench className={`w-5 h-5 transition-transform ${isToolActive || toolsSheetOpen ? 'scale-105' : ''}`} />
            <span className="mt-1">Tools</span>
            {isToolActive && <span className="w-1 h-1 rounded-full bg-zinc-900 dark:bg-zinc-100 mt-0.5" />}
          </button>
        </div>
      </nav>

      {/* Tools Bottom Sheet Drawer on Mobile */}
      {toolsSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setToolsSheetOpen(false)}
          />

          {/* Sliding Sheet Panel */}
          <div className="relative z-10 bg-white dark:bg-[#111115] border-t border-zinc-200 dark:border-[#262632] rounded-t-2xl shadow-xl p-4 max-h-[80vh] flex flex-col overflow-hidden animate-slide-up">
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">All Creative Image Tools</h3>
              </div>
              <button
                type="button"
                onClick={() => setToolsSheetOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-2 gap-2 py-4 overflow-y-auto">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isSelected = location.pathname === tool.to;
                return (
                  <NavLink
                    key={tool.to}
                    to={tool.to}
                    onClick={() => setToolsSheetOpen(false)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all interactive-press ${
                      isSelected
                        ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-950 dark:text-zinc-100'
                        : 'bg-zinc-50 dark:bg-[#15151a] border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                      <span className="truncate">{tool.title}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
