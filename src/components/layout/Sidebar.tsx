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
  Palette
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
          'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-lime-400/10 text-lime-400 font-semibold border-l-2 border-lime-400'
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
          collapsed && 'justify-center px-2 py-2.5'
        )
      }
    >
      <Icon className={cn('w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-105')} />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge !== undefined && (
        <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
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
        'flex flex-col h-full bg-[#111115] border-r border-[#22222a] text-zinc-300 transition-all duration-200 select-none',
        collapsed ? 'w-18' : 'w-64',
        isMobile && 'w-72'
      )}
    >
      {/* Brand Header */}
      <div className={cn('flex items-center px-4 h-16 border-b border-[#22222a]', collapsed ? 'justify-center' : 'justify-between')}>
        <NavLink to="/" onClick={handleLinkClick} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-lime-400 flex items-center justify-center text-black font-bold shadow-[0_0_12px_rgba(163,230,53,0.35)] transition-transform group-hover:scale-105">
            <Palette className="w-5 h-5 text-black" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-wide text-zinc-100 flex items-center gap-1.5">
                IMAGO <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-lime-400/20 text-lime-400 font-mono">Studio</span>
              </span>
              <span className="text-[10px] text-zinc-500">Image Workspace</span>
            </div>
          )}
        </NavLink>

        {isMobile ? (
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Primary Action Button */}
      {!collapsed ? (
        <div className="p-3">
          <button
            onClick={() => {
              setActiveCreateProjectModal(true);
              handleLinkClick();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-lime-400 hover:bg-lime-300 text-black font-semibold text-xs rounded-lg shadow-sm transition-all duration-150 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      ) : (
        <div className="p-2 flex justify-center">
          <button
            onClick={() => {
              setActiveCreateProjectModal(true);
            }}
            title="New Project"
            className="w-10 h-10 flex items-center justify-center bg-lime-400 hover:bg-lime-300 text-black rounded-lg shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Navigation Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {/* Core Library Navigation */}
        <div className="space-y-1">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/library" icon={Images} label="All Images" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/projects" icon={FolderKanban} label="Projects" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/recent" icon={Clock} label="Recent Files" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/favorites" icon={Star} label="Favorites" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/drafts" icon={FileEdit} label="Drafts" collapsed={collapsed} onClick={handleLinkClick} />
          <NavItem to="/trash" icon={Trash2} label="Trash" collapsed={collapsed} onClick={handleLinkClick} />
        </div>

        {/* Tools Section */}
        <div className="space-y-1">
          {!collapsed ? (
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
            >
              <span className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5" />
                Image Tools
              </span>
              {toolsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <div className="h-px bg-zinc-800 my-2" />
          )}

          {(toolsOpen || collapsed) && (
            <div className="space-y-1 pl-1">
              <NavItem to="/tools/compress" icon={Minimize2} label="Compressor" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/resize" icon={Maximize2} label="Resizer" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/crop" icon={Crop} label="Cropper" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/collage" icon={Layers} label="Collage Maker" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/background-remove" icon={Sparkles} label="Remove Background" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/face-blur" icon={EyeOff} label="Face & Blur" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/convert" icon={RefreshCw} label="Converter" collapsed={collapsed} onClick={handleLinkClick} />
              <NavItem to="/tools/utilities" icon={Sliders} label="Utilities Suite" collapsed={collapsed} onClick={handleLinkClick} />
            </div>
          )}
        </div>
      </div>

      {/* Footer: Storage & Settings */}
      <div className="p-3 border-t border-[#22222a] space-y-2 bg-[#0e0e11]">
        {/* Storage Bar */}
        {!collapsed ? (
          <div className="p-2.5 rounded-lg bg-[#16161b] border border-[#23232c] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                Local Storage
              </span>
              <span className="text-zinc-500 font-mono text-[11px]">
                {storageUsed > 0 ? formatBytes(storageUsed) : '0 B'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  storagePercent > 80 ? 'bg-red-400' : storagePercent > 60 ? 'bg-yellow-400' : 'bg-lime-400'
                )}
                style={{ width: `${Math.max(4, storagePercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>{storagePercent}% used</span>
              <span>100% Client-Side</span>
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
