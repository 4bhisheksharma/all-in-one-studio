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

export const SettingsPage: React.FC = () => {
  const { storageUsed, storageQuota, updateStorageUsage, theme, setTheme } = useUIStore();
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
      <div className="p-6 rounded-2xl bg-[#141418] border border-[#23232c] space-y-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Interface Theme</h3>
          <p className="text-xs text-zinc-400">
            Choose between dark mode, white theme, or system synchronized appearance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'dark' as const, label: 'Dark Mode', desc: 'Restrained graphite palette', icon: Moon },
            { id: 'light' as const, label: 'White Theme', desc: 'Crisp minimal light interface', icon: Sun },
            { id: 'system' as const, label: 'System Default', desc: 'Matches device preference', icon: Laptop },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTheme(item.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
                  isSelected
                    ? 'bg-zinc-800/80 border-zinc-500 shadow-sm'
                    : 'bg-[#0e0e12] border-[#1e1e26] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-zinc-100' : 'text-zinc-400'}`} />
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-zinc-200" />
                  )}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage Breakdown Card */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-[#23232c] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">IndexedDB Browser Storage</h3>
              <p className="text-xs text-zinc-400">
                All full-resolution binaries, optimized thumbnails, and drafts reside in local browser storage.
              </p>
            </div>
          </div>

          <button
            onClick={() => updateStorageUsage()}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Refresh storage quota"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Storage Bar */}
        <div className="p-4 rounded-xl bg-[#0e0e12] border border-[#1e1e26] space-y-3">
          <div className="flex justify-between text-xs text-zinc-300">
            <span>
              Storage Used: <strong className="font-mono text-zinc-100">{formatBytes(storageUsed)}</strong>
            </span>
            <span>
              Available Quota: <strong className="font-mono text-zinc-100">{storageQuota > 0 ? formatBytes(storageQuota) : 'Calculating...'}</strong>
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-lime-400 rounded-full transition-all"
              style={{
                width: `${storageQuota > 0 ? Math.min(100, Math.max(1, Math.round((storageUsed / storageQuota) * 100))) : 1}%`,
              }}
            />
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <Images className="w-3.5 h-3.5 text-lime-400" />
              <span>Library Assets</span>
            </div>
            <p className="text-lg font-bold text-zinc-100 font-mono">{assets.length}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <FolderKanban className="w-3.5 h-3.5 text-sky-400" />
              <span>Projects</span>
            </div>
            <p className="text-lg font-bold text-zinc-100 font-mono">{projects.length}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <FileEdit className="w-3.5 h-3.5 text-amber-400" />
              <span>Active Drafts</span>
            </div>
            <p className="text-lg font-bold text-zinc-100 font-mono">{drafts.length}</p>
          </div>
        </div>
      </div>

      {/* Data Management Actions */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-[#23232c] space-y-4">
        <h3 className="text-base font-semibold text-zinc-100">Backup & Data Management</h3>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0e0e12] border border-[#1e1e26]">
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">Export Entire Workspace</h4>
            <p className="text-xs text-zinc-400 max-w-md">
              Download all your projects, metadata, and original photos as a single compressed ZIP archive.
            </p>
          </div>
          <button
            onClick={handleExportWorkspace}
            disabled={exporting || assets.length === 0}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-zinc-700 shrink-0"
          >
            <Download className="w-4 h-4 text-lime-400" />
            <span>{exporting ? 'Packing Backup...' : 'Export Backup (.zip)'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <div>
            <h4 className="text-sm font-semibold text-red-400">Reset Local Workspace</h4>
            <p className="text-xs text-zinc-400 max-w-md">
              Permanently purges all IndexedDB tables (images, projects, and drafts) and frees disk space.
            </p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-red-500/30 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Workspace</span>
          </button>
        </div>
      </div>

      {/* Zero-Telemetry Privacy Guarantee */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-[#23232c] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Zero-Telemetry Privacy Guarantee</h3>
            <p className="text-xs text-zinc-400">Images never leave this browser device.</p>
          </div>
        </div>

        <div className="text-xs text-zinc-400 space-y-2.5 leading-relaxed bg-[#0e0e12] p-4 rounded-xl border border-[#1e1e26]">
          <p>
            • <strong>No Cloud Sync:</strong> All processing operations (resizing, compression, background removal, face blur) execute exclusively using HTML5 Canvas, WebAssembly, and client-side Web Workers.
          </p>
          <p>
            • <strong>Browser Data Caution:</strong> Clearing your browser&apos;s site data/cookies for this domain will purge IndexedDB tables. Use the Export features to keep offline copies of critical work.
          </p>
        </div>
      </div>

      {/* About Card */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-[#23232c] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">Imago All-in-One Image Workspace</h4>
            <p className="text-xs text-zinc-500">Production-Ready Client-Side Suite · React 19 + Vite + TypeScript</p>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#141418] border border-red-500/30 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Are you absolutely sure?</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Resetting your workspace will delete all <strong className="text-zinc-200">{assets.length} image assets</strong>,{' '}
              <strong className="text-zinc-200">{projects.length} projects</strong>, and all autosaved drafts from your browser&apos;s IndexedDB database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearWorkspace}
                disabled={clearing}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
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
