import React, { useState, useMemo } from 'react';
import {
  FileText,
  FolderOpen,
  Download,
  Check,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Type,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AssetPickerDialog } from '@/components/image-picker/AssetPickerDialog';
import { AssetThumbnail } from '@/components/asset-grid/AssetThumbnail';
import {
  renamerService,
  RenameRule,
  RenamePreviewItem,
} from '@/services/image-processing/renamerService';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { useAssetStore } from '@/stores/assetStore';
import { ImageAsset } from '@/types';
import { zipSync } from 'fflate';
import { toast } from 'sonner';

export const RenamerPage: React.FC = () => {
  const { fetchAssets } = useAssetStore();
  const [selectedAssets, setSelectedAssets] = useState<ImageAsset[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  // Rename Rules State
  const [pattern, setPattern] = useState('{name}_{index}');
  const [startIndex, setStartIndex] = useState(1);
  const [padding, setPadding] = useState(2);
  const [search, setSearch] = useState('');
  const [replace, setReplace] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [spaceHandling, setSpaceHandling] = useState<RenameRule['spaceHandling']>('keep');
  const [caseTransform, setCaseTransform] = useState<RenameRule['caseTransform']>('none');

  const rules: RenameRule = useMemo(
    () => ({
      pattern,
      startIndex,
      padding,
      search,
      replace,
      useRegex,
      prefix,
      suffix,
      spaceHandling,
      caseTransform,
    }),
    [pattern, startIndex, padding, search, replace, useRegex, prefix, suffix, spaceHandling, caseTransform]
  );

  const previewItems: RenamePreviewItem[] = useMemo(() => {
    return renamerService.generateNewNames(selectedAssets, rules);
  }, [selectedAssets, rules]);

  const hasDuplicates = previewItems.some((p) => p.isDuplicate);
  const changedCount = previewItems.filter((p) => p.changed).length;

  const insertToken = (token: string) => {
    setPattern((prev) => `${prev}${token}`);
  };

  const handleApplyToLibrary = async () => {
    if (selectedAssets.length === 0) return;
    if (hasDuplicates) {
      toast.error('Cannot apply changes: Duplicate filename collision detected');
      return;
    }

    setApplying(true);
    try {
      let count = 0;
      for (const item of previewItems) {
        if (item.changed) {
          await assetService.updateAsset(item.id, { filename: item.newName });
          count++;
        }
      }

      await fetchAssets();
      // Update local state with the new names
      setSelectedAssets((prev) =>
        prev.map((a) => {
          const matching = previewItems.find((p) => p.id === a.id);
          return matching ? { ...a, filename: matching.newName } : a;
        })
      );

      toast.success(`Renamed ${count} assets in your library!`);
    } catch {
      toast.error('Failed to update asset names in library');
    } finally {
      setApplying(false);
    }
  };

  const handleDownloadZip = async () => {
    if (selectedAssets.length === 0) return;
    try {
      const zipData: Record<string, Uint8Array> = {};

      for (const item of previewItems) {
        const blob = await assetService.getAssetBlob(item.id);
        if (blob) {
          const buf = await blob.arrayBuffer();
          zipData[item.newName] = new Uint8Array(buf);
        }
      }

      const zipped = zipSync(zipData);
      const zipBlob = new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });
      downloadService.downloadBlob(zipBlob, `renamed-assets-${Date.now()}.zip`);
      toast.success('Downloaded renamed assets ZIP package');
    } catch {
      toast.error('Failed to package renamed files');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Bulk File Renamer & Pattern Engine"
        description="Standardize, clean, and sequence filenames across entire collections using dynamic tokens, search/replace, and case conversions."
        actions={
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Select Images ({selectedAssets.length})</span>
          </button>
        }
      />

      {/* Main Configuration Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 space-y-5 shadow-sm">
        {/* Token Pattern Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-zinc-500" />
              Naming Pattern
            </label>
            <span className="text-[11px] text-zinc-400 font-mono">
              Click tokens below to append
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="{name}_{index}"
              className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
            <button
              type="button"
              onClick={() => setPattern('{name}')}
              title="Reset to original filename"
              className="shrink-0 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#141418] text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Interactive Token Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {[
              { token: '{name}', label: 'Original Name' },
              { token: '{index}', label: 'Sequence Index' },
              { token: '{date}', label: 'Date (YYYY-MM-DD)' },
              { token: '{w}', label: 'Width (px)' },
              { token: '{h}', label: 'Height (px)' },
              { token: '{w}x{h}', label: 'Resolution' },
              { token: '{ext}', label: 'Extension' },
            ].map((t) => (
              <button
                key={t.token}
                type="button"
                onClick={() => insertToken(t.token)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700/60 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-zinc-500" />
                <span>{t.token}</span>
                <span className="text-[10px] text-zinc-400 font-sans">({t.label})</span>
              </button>
            ))}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-zinc-500">Presets:</span>
            {[
              { label: 'Name + Number', val: '{name}_{index}' },
              { label: 'Date + Name', val: '{date}_{name}' },
              { label: 'Photo Dimensions', val: 'photo_{w}x{h}_{index}' },
              { label: 'Sequenced Clean', val: 'asset_{index}' },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setPattern(preset.val)}
                className="px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Index & Padding Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Start Sequence At</label>
            <input
              type="number"
              min={0}
              value={startIndex}
              onChange={(e) => setStartIndex(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Zero Padding Digits</label>
            <select
              value={padding}
              onChange={(e) => setPadding(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 font-mono"
            >
              <option value={1}>1 (e.g. 1, 2, 3)</option>
              <option value={2}>2 (e.g. 01, 02, 03)</option>
              <option value={3}>3 (e.g. 001, 002, 003)</option>
              <option value={4}>4 (e.g. 0001, 0002)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Prepend Prefix</label>
            <input
              type="text"
              placeholder="e.g. web_"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Append Suffix</label>
            <input
              type="text"
              placeholder="e.g. _v1"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200"
            />
          </div>
        </div>

        {/* Search & Replace + Case Formatting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">Find Text</label>
              <label className="flex items-center gap-1 text-[10px] text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRegex}
                  onChange={(e) => setUseRegex(e.target.checked)}
                  className="accent-zinc-900 dark:accent-zinc-100 rounded"
                />
                <span>Regex</span>
              </label>
            </div>
            <input
              type="text"
              placeholder="Text to replace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Replace With</label>
            <input
              type="text"
              placeholder="Replacement..."
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Space Characters</label>
            <select
              value={spaceHandling}
              onChange={(e) => setSpaceHandling(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
            >
              <option value="keep">Keep Spaces</option>
              <option value="hyphen">Replace with hyphen (-)</option>
              <option value="underscore">Replace with underscore (_)</option>
              <option value="remove">Remove all spaces</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Case Transformation</label>
            <select
              value={caseTransform}
              onChange={(e) => setCaseTransform(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
            >
              <option value="none">No case change</option>
              <option value="lowercase">lowercase</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="title">Title Case</option>
              <option value="kebab">kebab-case</option>
              <option value="snake">snake_case</option>
              <option value="camel">camelCase</option>
            </select>
          </div>
        </div>
      </div>

      {/* Comparison & Preview Section */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Live Rename Preview</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-normal">
                {changedCount} will be updated
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Inspect before-and-after name mappings with automated collision detection.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            <button
              disabled={selectedAssets.length === 0 || hasDuplicates || applying}
              onClick={handleApplyToLibrary}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer"
            >
              {applying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Applying Names...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply to Library</span>
                </>
              )}
            </button>

            <button
              disabled={selectedAssets.length === 0}
              onClick={handleDownloadZip}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-all border border-zinc-200 dark:border-zinc-700 cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download ZIP</span>
            </button>
          </div>
        </div>

        {/* Duplicate Warning Alert */}
        {hasDuplicates && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Duplicate names detected. Please adjust sequence padding, startIndex, or pattern to ensure unique filenames.
            </span>
          </div>
        )}

        {/* Table Preview */}
        {selectedAssets.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 space-y-3">
            <FileText className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">No images selected yet.</p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Select Images from Library</span>
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0e0e12] overflow-x-auto">
            <table className="w-full min-w-[560px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-[#121217] text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
                  <th className="p-3 w-12 text-center">Thumb</th>
                  <th className="p-3">Current Name</th>
                  <th className="p-3 w-8 text-center"></th>
                  <th className="p-3">New Name</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-zinc-100 dark:border-zinc-800/60 transition-colors ${
                      item.isDuplicate
                        ? 'bg-red-500/5 dark:bg-red-500/10'
                        : 'hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <td className="p-2.5 text-center">
                      <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mx-auto">
                        <AssetThumbnail assetId={item.id} alt={item.originalName} />
                      </div>
                    </td>
                    <td className="p-2.5 font-mono text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]" title={item.originalName}>
                      {item.originalName}
                    </td>
                    <td className="p-2.5 text-center text-zinc-400">
                      <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                    </td>
                    <td className="p-2.5 font-mono font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[240px]" title={item.newName}>
                      {item.newName}
                    </td>
                    <td className="p-2.5 text-right font-mono text-[11px]">
                      {item.isDuplicate ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-500/20">
                          Duplicate
                        </span>
                      ) : item.changed ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                          Updated
                        </span>
                      ) : (
                        <span className="text-zinc-400">Unchanged</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Asset Picker Modal */}
      <AssetPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multiSelect
        title="Select Images for Bulk Renaming"
        description="Pick image assets from your library or project to rename in bulk."
        onSelect={(selected) => {
          setSelectedAssets(selected);
        }}
      />
    </div>
  );
};
