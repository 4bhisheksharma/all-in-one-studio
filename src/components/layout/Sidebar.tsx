import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Images,
  FolderKanban,
  Clock,
  Star,
  FileEdit,
  Trash2,
  Wrench,
  Minimize2,
  Maximize2,
  Crop,
  Layers,
  Sparkles,
  EyeOff,
  RefreshCw,
  Sliders,
  Settings,
  HardDrive,
  Plus,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Wand2,
  Smartphone,
  Grid,
  FileText,
  Laptop,
  Terminal,
  Scan,
  Film,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cn, formatBytes } from '@/utils/cn';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: string | number;
  collapsed?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, badge, collapsed, onClick }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150',
          isActive
            ? 'bg-zinc-200/90 text-zinc-950 font-semibold dark:bg-zinc-800 dark:text-zinc-100'
            : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50',
          collapsed && 'justify-center px-2 py-2'
        )
      }
    >
      <Icon className={cn('w-4 h-4 shrink-0')} />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge !== undefined && (
        <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 font-mono">
          {badge}
        </span>
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const {
    sidebarCollapsed,
    toggleSidebar,
    storageUsed,
    storageQuota,
    setMobileDrawerOpen,
    setActiveCreateProjectModal,
  } = useUIStore();

  const [toolsOpen, setToolsOpen] = useState(true);

  const collapsed = !isMobile && sidebarCollapsed;
  const storagePercent = storageQuota > 0 ? Math.min(100, Math.round((storageUsed / storageQuota) * 100)) : 2;

  const handleLinkClick = () => {
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-zinc-50/90 dark:bg-[#0e0e11] border-r border-zinc-200 dark:border-[#22222a] text-zinc-700 dark:text-zinc-300 transition-colors select-none',
        collapsed ? 'w-16' : 'w-60',
        isMobile && 'w-68'
      )}
    >
      {/* Brand Header */}
      <div className={cn('flex items-center px-4 h-14 border-b border-zinc-200 dark:border-[#22222a]', collapsed ? 'justify-center' : 'justify-between')}>
        <NavLink to="/" onClick={handleLinkClick} className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-transform group-hover:scale-105 shrink-0 bg-white dark:bg-[#09090b]">
            <img src={`${import.meta.env.BASE_URL}imago-logo.png`} alt="Imago Logo" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-xs tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                IMAGO <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 font-mono">Studio</span>
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">Creative Image Workspace</span>
            </div>
          )}
        </NavLink>

        {isMobile ? (
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Primary Action Button */}
      {!collapsed ? (
        <div className="p-3 pb-1">
          <button
            onClick={() => {
              setActiveCreateProjectModal(true);
              handleLinkClick();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs rounded-lg shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      ) : (
        <div className="p-2 pb-1 flex justify-center">
          <button
            onClick={() => {
              setActiveCreateProjectModal(true);
            }}
            title="New Project"
            className="w-9 h-9 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 rounded-lg shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4">
        {/* Core Library Navigation */}
        <div className="space-y-0.5">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/library" icon={Images} label="All Images" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/batch-queue" icon={Layers} label="Batch Queue" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/projects" icon={FolderKanban} label="Projects" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/recent" icon={Clock} label="Recent Files" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/favorites" icon={Star} label="Favorites" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/drafts" icon={FileEdit} label="Drafts" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/trash" icon={Trash2} label="Trash" collapsed={collapsed} onClick={handleLinkClick} />
        </div>

        {/* Tools Section */}
        <div className="space-y-0.5">
          {!collapsed ? (
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <span className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5" />
                Image Tools
              </span>
              {toolsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
          )}

          {(toolsOpen || collapsed) && (
            <div className="space-y-0.5">
              <NavItem to="/tools/app-icons" icon={Smartphone} label="App Icon Generator" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/recipes" icon={Wand2} label="Smart Recipes" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/canvas" icon={Layers} label="Studio Canvas" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/compress" icon={Minimize2} label="Compressor" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/resize" icon={Maximize2} label="Resizer" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/crop" icon={Crop} label="Cropper" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/collage" icon={Layers} label="Collage Maker" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/background-remove" icon={Sparkles} label="Remove Background" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/face-blur" icon={EyeOff} label="Face & Blur" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/convert" icon={RefreshCw} label="Converter" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/splitter" icon={Grid} label="Image Splitter" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/renamer" icon={FileText} label="Bulk Renamer" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/mockups" icon={Laptop} label="Device Mockups" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/pixel-ascii" icon={Terminal} label="Pixel & ASCII Studio" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/ocr" icon={Scan} label="OCR Text Scanner" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/gif-studio" icon={Film} label="GIF Studio" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/utilities" icon={Sliders} label="Utilities Suite" collapsed={collapsed} onClick={handleLinkClick} />
            </div>
          )}
        </div>
      </div>

      {/* Footer: Storage & Settings */}
      <div className="p-2.5 border-t border-zinc-200 dark:border-[#22222a] space-y-2 bg-zinc-100/50 dark:bg-[#0b0b0e]">
        {/* Storage Bar */}
        {!collapsed ? (
          <div className="p-2.5 rounded-lg bg-white dark:bg-[#141418] border border-zinc-200 dark:border-[#22222a] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-medium text-[11px]">
                <HardDrive className="w-3.5 h-3.5" />
                Local Storage
              </span>
              <span className="text-zinc-500 font-mono text-[10px]">
                {storageUsed > 0 ? formatBytes(storageUsed) : '0 B'}
              </span>
            </div>
            <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  storagePercent > 80 ? 'bg-rose-500' : storagePercent > 60 ? 'bg-amber-500' : 'bg-zinc-900 dark:bg-zinc-200'
                )}
                style={{ width: `${Math.max(4, storagePercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
              <span>{storagePercent}% used</span>
              <span>Client-Side</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1" title={`Storage: ${formatBytes(storageUsed)} used`}>
            <HardDrive className="w-4 h-4 text-zinc-400" />
          </div>
        )}

        <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} onClick={handleLinkClick} />
      </div>
    </aside>
  );
};

