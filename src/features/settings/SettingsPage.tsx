import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ShieldCheck, HardDrive, Info } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { formatBytes } from '@/utils/cn';

export const SettingsPage: React.FC = () => {
  const { storageUsed, storageQuota } = useUIStore();

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Settings & Storage"
        description="Workspace configuration, client-side storage usage, and privacy safeguards."
      />

      {/* Storage Breakdown Card */}
      <div className="p-6 rounded-xl bg-[#141418] border border-[#23232c] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center text-lime-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">IndexedDB Browser Storage</h3>
            <p className="text-xs text-zinc-400">All original assets, compressed files, and drafts reside locally in your browser.</p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#0e0e12] border border-[#1e1e26] space-y-2">
          <div className="flex justify-between text-xs text-zinc-300">
            <span>Storage Used: <strong className="font-mono text-zinc-100">{formatBytes(storageUsed)}</strong></span>
            <span>Available Quota: <strong className="font-mono text-zinc-100">{storageQuota > 0 ? formatBytes(storageQuota) : 'Calculating...'}</strong></span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-lime-400 rounded-full transition-all"
              style={{ width: `${storageQuota > 0 ? Math.min(100, Math.round((storageUsed / storageQuota) * 100)) : 1}%` }}
            />
          </div>
        </div>
      </div>

      {/* Privacy Architecture Card */}
      <div className="p-6 rounded-xl bg-[#141418] border border-[#23232c] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-400/10 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Zero-Telemetry Privacy Guarantee</h3>
            <p className="text-xs text-zinc-400">Images never leave this browser device.</p>
          </div>
        </div>

        <div className="text-xs text-zinc-400 space-y-2 leading-relaxed bg-[#0e0e12] p-4 rounded-lg border border-[#1e1e26]">
          <p>
            • <strong>No Cloud Sync:</strong> All processing operations (resizing, compression, background removal, face blur) execute exclusively using HTML5 Canvas, WebAssembly, and client-side Web Workers.
          </p>
          <p>
            • <strong>Browser Data Caution:</strong> Clearing your browser&apos;s site data/cookies for this domain will purge IndexedDB tables. Use the Export features to keep offline copies of critical work.
          </p>
        </div>
      </div>

      {/* About Card */}
      <div className="p-6 rounded-xl bg-[#141418] border border-[#23232c] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">Imago All-in-One Image Workspace</h4>
            <p className="text-xs text-zinc-500">Version 1.0.0 (Phase 1 Baseline) · React 19 + Vite + TypeScript</p>
          </div>
        </div>
      </div>
    </div>
  );
};
