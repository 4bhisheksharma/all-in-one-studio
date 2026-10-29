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
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const location = useLocation();

  const isToolActive =
    location.pathname.startsWith('/tools/') &&
    !location.pathname.includes('/canvas') &&
    !location.pathname.includes('/recipes');

  const tools = [
    { title: 'Compressor', to: '/tools/compress', icon: Minimize2, color: 'text-emerald-400' },
    { title: 'Resizer', to: '/tools/resize', icon: Maximize2, color: 'text-sky-400' },
    { title: 'Cropper', to: '/tools/crop', icon: Crop, color: 'text-cyan-400' },
    { title: 'Collage Maker', to: '/tools/collage', icon: Layers, color: 'text-amber-400' },
    { title: 'Remove BG', to: '/tools/background-remove', icon: Sparkles, color: 'text-pink-400' },
    { title: 'Face & Blur', to: '/tools/face-blur', icon: EyeOff, color: 'text-purple-400' },
    { title: 'Converter', to: '/tools/convert', icon: RefreshCw, color: 'text-blue-400' },
    { title: 'Utilities Suite', to: '/tools/utilities', icon: Sliders, color: 'text-zinc-400' },
    { title: 'Projects', to: '/projects', icon: FolderKanban, color: 'text-lime-400' },
    { title: 'Favorites', to: '/favorites', icon: Star, color: 'text-amber-300' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e13]/92 backdrop-blur-xl border-t border-[#23232c] shadow-[0_-8px_32px_rgba(0,0,0,0.6)] px-2 pt-1 pb-[max(env(safe-area-inset-bottom,0px),8px)]"
      >
        <div className="flex items-center justify-around h-13 max-w-lg mx-auto">
          {/* 1. Home / Dashboard */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-all duration-150 interactive-press ${
                isActive ? 'text-lime-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="mt-1">Home</span>
                {isActive && <span className="w-1.5 h-1 rounded-full bg-lime-400 mt-0.5" />}
              </>
            )}
          </NavLink>

          {/* 2. Library */}
          <NavLink
            to="/library"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-all duration-150 interactive-press ${
                isActive ? 'text-lime-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Images className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="mt-1">Library</span>
                {isActive && <span className="w-1.5 h-1 rounded-full bg-lime-400 mt-0.5" />}
              </>
            )}
          </NavLink>

          {/* 3. Smart Recipes (Automation) */}
          <NavLink
            to="/recipes"
            className={() => {
              const isActive = location.pathname === '/recipes' || location.pathname === '/tools/recipes';
              return `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-all duration-150 interactive-press ${
                isActive ? 'text-lime-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`;
            }}
          >
            {() => {
              const isActive = location.pathname === '/recipes' || location.pathname === '/tools/recipes';
              return (
                <>
                  <div className="relative">
                    <Wand2 className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-lime-400' : ''}`} />
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-lime-400 animate-ping opacity-75" />
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-lime-400" />
                  </div>
                  <span className="mt-1">Recipes</span>
                  {isActive && <span className="w-1.5 h-1 rounded-full bg-lime-400 mt-0.5" />}
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
                isActive ? 'text-lime-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`;
            }}
          >
            {() => {
              const isActive = location.pathname === '/canvas' || location.pathname === '/tools/canvas';
              return (
                <>
                  <Layers className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  <span className="mt-1">Canvas</span>
                  {isActive && <span className="w-1.5 h-1 rounded-full bg-lime-400 mt-0.5" />}
                </>
              );
            }}
          </NavLink>

          {/* 5. Tools Quick Launcher Sheet */}
          <button
            type="button"
            onClick={() => setToolsSheetOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-all duration-150 interactive-press ${
              isToolActive || toolsSheetOpen ? 'text-lime-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wrench className={`w-5 h-5 transition-transform ${isToolActive || toolsSheetOpen ? 'scale-110' : ''}`} />
            <span className="mt-1">Tools</span>
            {isToolActive && <span className="w-1.5 h-1 rounded-full bg-lime-400 mt-0.5" />}
          </button>
        </div>
      </nav>

      {/* Tools Bottom Sheet Drawer on Mobile */}
      {toolsSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setToolsSheetOpen(false)}
          />

          {/* Sliding Sheet Panel */}
          <div className="relative z-10 bg-[#131318] border-t border-[#262632] rounded-t-3xl shadow-2xl p-4 max-h-[80vh] flex flex-col overflow-hidden animate-slide-up">
            {/* Sheet Handle */}
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-3" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-lime-400" />
                <h3 className="text-sm font-bold text-zinc-100">All Creative Image Tools</h3>
              </div>
              <button
                type="button"
                onClick={() => setToolsSheetOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-2 gap-2.5 py-4 overflow-y-auto">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isSelected = location.pathname === tool.to;
                return (
                  <NavLink
                    key={tool.to}
                    to={tool.to}
                    onClick={() => setToolsSheetOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all interactive-press ${
                      isSelected
                        ? 'bg-lime-400/15 border-lime-400 text-lime-300'
                        : 'bg-[#181820] border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${tool.color}`} />
                      <span className="truncate">{tool.title}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
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
