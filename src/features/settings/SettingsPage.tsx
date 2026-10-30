import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  HardDrive,
  Info,
  Download,
  Trash2,
  FolderKanban,
  FileEdit,
  Images,
  AlertTriangle,
  RefreshCw,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useUIStore } from '@/stores/uiStore';
import { useAssetStore } from '@/stores/assetStore';
import { useProjectStore } from '@/stores/projectStore';
import { useDraftStore } from '@/stores/draftStore';
import { db } from '@/services/storage/db';
import { formatBytes } from '@/utils/cn';
import { zipSync } from 'fflate';
import { toast } from 'sonner';
import { toggleThemeWithAnimation } from '@/utils/themeTransition';

export const SettingsPage: React.FC = () => {
  const { storageUsed, storageQuota, updateStorageUsage, theme } = useUIStore();
  const { assets, fetchAssets } = useAssetStore();
  const { projects, fetchProjects } = useProjectStore();
  const { drafts, fetchDrafts } = useDraftStore();

  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchAssets();
    fetchProjects();
    fetchDrafts();
    updateStorageUsage();
  }, [fetchAssets, fetchProjects, fetchDrafts, updateStorageUsage]);

  // Export full workspace backup
  const handleExportWorkspace = async () => {
    setExporting(true);
    try {
      const allAssets = await db.assets.toArray();
      const allProjects = await db.projects.toArray();
      const allFolders = await db.folders.toArray();
      const allDrafts = await db.drafts.toArray();
      const allBlobs = await db.assetBlobs.toArray();

      const manifest = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        assets: allAssets,
        projects: allProjects,
        folders: allFolders,
        drafts: allDrafts,
      };

      const zipFiles: Record<string, Uint8Array> = {};
      zipFiles['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest, null, 2));

      for (const item of allBlobs) {
        const matchingAsset = allAssets.find((a) => a.id === item.id);
        const name = matchingAsset ? `images/${matchingAsset.filename}` : `images/${item.id}`;
        const buf = await item.blob.arrayBuffer();
        zipFiles[name] = new Uint8Array(buf);
      }

      const zipped = zipSync(zipFiles);
      const blob = new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imago-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Workspace exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export workspace backup.');
    } finally {
      setExporting(false);
    }
  };

  // Clear entire workspace
  const handleClearWorkspace = async () => {
    setClearing(true);
    try {
      await db.assets.clear();
      await db.assetBlobs.clear();
      await db.thumbnailBlobs.clear();
      await db.projects.clear();
      await db.folders.clear();
      await db.drafts.clear();

      await fetchAssets();
      await fetchProjects();
      await fetchDrafts();
      await updateStorageUsage();

      setShowClearConfirm(false);
      toast.success('Workspace data reset cleanly.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset workspace.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      <PageHeader
        title="Settings & Storage"
        description="Workspace configuration, appearance theme, client-side storage usage, and privacy safeguards."
      />

      {/* Interface Theme / Appearance Card */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Interface Theme</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Choose between dark mode, light theme, or system synchronized appearance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { id: 'dark' as const, label: 'Dark Mode', desc: 'Restrained graphite palette', icon: Moon },
            { id: 'light' as const, label: 'Light Theme', desc: 'Crisp minimal light interface', icon: Sun },
            { id: 'system' as const, label: 'System Default', desc: 'Matches device preference', icon: Laptop },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                onClick={(e) => toggleThemeWithAnimation(e.currentTarget, item.id)}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                  isSelected
                    ? 'bg-zinc-100 dark:bg-zinc-800/90 border-zinc-400 dark:border-zinc-600 shadow-xs'
                    : 'bg-zinc-50/60 dark:bg-[#141418] border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} />
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                  )}
                </div>
                <div>
                  <p className={`text-xs font-medium ${isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage Breakdown Card */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">IndexedDB Browser Storage</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Full-resolution binaries, optimized thumbnails, and drafts reside in local browser storage.
              </p>
            </div>
          </div>

          <button
            onClick={() => updateStorageUsage()}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Refresh storage quota"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Storage Bar */}
        <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800/80 space-y-2.5">
          <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-300">
            <span>
              Storage Used: <strong className="font-mono text-zinc-900 dark:text-zinc-100">{formatBytes(storageUsed)}</strong>
            </span>
            <span>
              Available Quota: <strong className="font-mono text-zinc-900 dark:text-zinc-100">{storageQuota > 0 ? formatBytes(storageQuota) : 'Calculating...'}</strong>
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-900 dark:bg-zinc-200 rounded-full transition-all"
              style={{
                width: `${storageQuota > 0 ? Math.min(100, Math.max(1, Math.round((storageUsed / storageQuota) * 100))) : 1}%`,
              }}
            />
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-0.5">
            <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs">
              <Images className="w-3.5 h-3.5" />
              <span>Library Assets</span>
            </div>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{assets.length}</p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-0.5">
            <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs">
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Projects</span>
            </div>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{projects.length}</p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-0.5">
            <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs">
              <FileEdit className="w-3.5 h-3.5" />
              <span>Active Drafts</span>
            </div>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{drafts.length}</p>
          </div>
        </div>
      </div>

      {/* Data Management Actions */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3.5 shadow-xs">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Backup & Data Management</h3>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800/80">
          <div>
            <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Export Entire Workspace</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-md">
              Download all your projects, metadata, and original photos as a single compressed ZIP archive.
            </p>
          </div>
          <button
            onClick={handleExportWorkspace}
            disabled={exporting || assets.length === 0}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 disabled:opacity-50 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Packing Backup...' : 'Export Backup (.zip)'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3.5 rounded-lg bg-rose-50/50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20">
          <div>
            <h4 className="text-xs font-semibold text-rose-700 dark:text-rose-400">Reset Local Workspace</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-md">
              Permanently purges all IndexedDB tables (images, projects, and drafts) and frees disk space.
            </p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-300 dark:border-rose-500/30 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Workspace</span>
          </button>
        </div>
      </div>

      {/* Privacy Guarantee */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Zero-Telemetry Privacy Guarantee</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Images never leave this browser device.</p>
          </div>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-2 leading-relaxed bg-zinc-50 dark:bg-[#141418] p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800/80">
          <p>
            • <strong>No Cloud Sync:</strong> All processing operations (resizing, compression, background removal, face blur) execute exclusively using HTML5 Canvas, WebAssembly, and client-side Web Workers.
          </p>
          <p>
            • <strong>Browser Data Caution:</strong> Clearing your browser&apos;s site data/cookies for this domain will purge IndexedDB tables. Use the Export features to keep offline copies of critical work.
          </p>
        </div>
      </div>

      {/* About Card */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Imago All-in-One Image Workspace</h4>
            <p className="text-[11px] text-zinc-500">Client-Side Suite · React 19 + Vite + TypeScript</p>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-5 rounded-xl bg-white dark:bg-[#141418] border border-rose-300 dark:border-rose-500/30 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Are you absolutely sure?</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Resetting your workspace will delete all <strong className="text-zinc-900 dark:text-zinc-200">{assets.length} image assets</strong>,{' '}
              <strong className="text-zinc-900 dark:text-zinc-200">{projects.length} projects</strong>, and all autosaved drafts from your browser&apos;s IndexedDB database.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearWorkspace}
                disabled={clearing}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearing ? 'Clearing...' : 'Yes, Delete Everything'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
