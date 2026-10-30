import React, { useState, useRef } from 'react';
import {
  X,
  Play,
  Download,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UploadCloud,
  Layers,
} from 'lucide-react';
import { ImageRecipe, BatchItemProgress } from './types';
import { Project, ImageAsset } from '@/types';
import { AssetPickerDialog } from '@/components/image-picker/AssetPickerDialog';
import { assetService } from '@/services/storage/assetService';
import { recipeExecutor } from '@/services/image-processing/recipeExecutor';
import { formatBytes } from '@/utils/cn';
import { zipSync } from 'fflate';
import { toast } from 'sonner';

interface BatchExecutionModalProps {
  open: boolean;
  recipe: ImageRecipe | null;
  projects: Project[];
  onClose: () => void;
}

export const BatchExecutionModal: React.FC<BatchExecutionModalProps> = ({
  open,
  recipe,
  projects,
  onClose,
}) => {
  const [items, setItems] = useState<
    { id: string; filename: string; blob: Blob; size: number }[]
  >([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    recipe?.targetProjectId || ''
  );
  const [saveToLibrary, setSaveToLibrary] = useState<boolean>(true);

  // Execution states
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentStepName, setCurrentStepName] = useState<string>('');
  const [progressList, setProgressList] = useState<BatchItemProgress[]>([]);
  const [completed, setCompleted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open || !recipe) return null;

  // Add items from library picker
  const handleSelectAssetsFromLibrary = async (assets: ImageAsset[]) => {
    const loaded: { id: string; filename: string; blob: Blob; size: number }[] = [];
    for (const a of assets) {
      const blob = await assetService.getAssetBlob(a.id);
      if (blob) {
        loaded.push({
          id: a.id,
          filename: a.filename,
          blob,
          size: a.currentSize,
        });
      }
    }
    setItems((prev) => [...prev, ...loaded]);
    toast.success(`Added ${loaded.length} image(s) for batch recipe`);
  };

  // Add items from direct file drop / browse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newItems = files.map((file) => ({
        id: crypto.randomUUID(),
        filename: file.name,
        blob: file,
        size: file.size,
      }));
      setItems((prev) => [...prev, ...newItems]);
      toast.success(`Loaded ${newItems.length} file(s)`);
    }
  };

  // Run the batch pipeline
  const handleRunBatch = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one image to execute');
      return;
    }

    setRunning(true);
    setCompleted(false);

    const initialProgress: BatchItemProgress[] = items.map((item) => ({
      id: item.id,
      filename: item.filename,
      status: 'pending',
      originalSize: item.size,
    }));
    setProgressList(initialProgress);

    const completedResults: { filename: string; blob: Blob; width: number; height: number }[] = [];

    for (let i = 0; i < items.length; i++) {
      setCurrentIndex(i);
      const item = items[i];

      setProgressList((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, status: 'processing' } : p))
      );

      try {
        const out = await recipeExecutor.executeRecipe(
          item.blob,
          recipe,
          (_stepIdx, stepName) => {
            setCurrentStepName(stepName);
          }
        );

        // Replace extension based on output mimeType
        const ext = out.mimeType === 'image/webp' ? '.webp' : out.mimeType === 'image/jpeg' ? '.jpg' : '.png';
        const baseName = item.filename.substring(0, item.filename.lastIndexOf('.')) || item.filename;
        const finalFilename = `${baseName}${ext}`;

        completedResults.push({
          filename: finalFilename,
          blob: out.blob,
          width: out.width,
          height: out.height,
        });

        // Save to IndexedDB Library if enabled
        if (saveToLibrary) {
          const file = new File([out.blob], finalFilename, { type: out.mimeType });
          await assetService.createAsset(
            file,
            selectedProjectId || null
          );
        }

        setProgressList((prev) =>
          prev.map((p, idx) =>
            idx === i
              ? {
                  ...p,
                  status: 'done',
                  resultBlob: out.blob,
                  processedSize: out.blob.size,
                  outputWidth: out.width,
                  outputHeight: out.height,
                }
              : p
          )
        );
      } catch (err) {
        setProgressList((prev) =>
          prev.map((p, idx) =>
            idx === i
              ? {
                  ...p,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Processing failed',
                }
              : p
          )
        );
      }
    }

    setRunning(false);
    setCompleted(true);
    toast.success(`Batch recipe completed! Processed ${completedResults.length} images.`);
  };

  // Download all as ZIP
  const handleDownloadZip = async () => {
    const doneItems = progressList.filter((p) => p.status === 'done' && p.resultBlob);
    if (doneItems.length === 0) return;

    const zipFiles: { [filename: string]: Uint8Array } = {};
    for (const item of doneItems) {
      if (item.resultBlob) {
        const buffer = await item.resultBlob.arrayBuffer();
        zipFiles[item.filename] = new Uint8Array(buffer);
      }
    }

    const zipped = zipSync(zipFiles);
    const zipBlob = new Blob([zipped as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.name.toLowerCase().replace(/\s+/g, '-')}-batch.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Batch archive downloaded (.zip)');
  };

  const totalInputSize = items.reduce((acc, i) => acc + i.size, 0);
  const totalOutputSize = progressList
    .filter((p) => p.processedSize)
    .reduce((acc, p) => acc + (p.processedSize || 0), 0);
  const savingsPct =
    totalInputSize > 0 && totalOutputSize > 0
      ? Math.round(((totalInputSize - totalOutputSize) / totalInputSize) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{recipe.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{recipe.name}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium uppercase border border-zinc-200 dark:border-zinc-700">
                  Batch Run
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{recipe.description}</p>
            </div>
          </div>

          {!running && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Recipe Steps Sequence Summary */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block uppercase tracking-wider">
              Sequence of Actions ({recipe.steps.filter((s) => s.enabled).length} Steps)
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {recipe.steps
                .filter((s) => s.enabled)
                .map((step, idx) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px]"
                  >
                    <span className="text-zinc-900 dark:text-zinc-100 font-mono font-semibold">{idx + 1}.</span>
                    <span>{step.name}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Image Selection Area (Before or during execution) */}
          {!running && !completed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                  Select Target Images ({items.length} chosen)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                    <span>Choose from Library</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                    <span>Upload Files</span>
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <div
                  onClick={() => setPickerOpen(true)}
                  className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl p-8 text-center text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <Layers className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">No images selected for this recipe</p>
                  <p className="text-[11px] text-zinc-500">
                    Click here to pick images from your library or upload files.
                  </p>
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-1 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-zinc-400 dark:text-zinc-500 text-[10px]">{idx + 1}.</span>
                        <span className="truncate">{item.filename}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                          {formatBytes(item.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Target Project and Output Configuration */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <div className="space-y-1">
                  <label className="text-zinc-600 dark:text-zinc-400 font-medium">Save Results to Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 cursor-pointer"
                  >
                    <option value="">Default (No specific project)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 cursor-pointer py-1.5">
                    <input
                      type="checkbox"
                      checked={saveToLibrary}
                      onChange={(e) => setSaveToLibrary(e.target.checked)}
                      className="accent-zinc-900 dark:accent-zinc-100"
                    />
                    <span>Add processed images into Studio Library</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Running Progress View */}
          {(running || completed) && (
            <div className="space-y-4 animate-in fade-in">
              {/* Progress Bar & Current Status */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {running ? (
                      <Loader2 className="w-4 h-4 text-zinc-700 dark:text-zinc-300 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {running
                        ? `Processing image ${currentIndex + 1} of ${items.length}...`
                        : 'Batch Processing Complete!'}
                    </span>
                  </div>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold">
                    {Math.round(
                      ((progressList.filter((p) => p.status === 'done' || p.status === 'error').length) /
                        (items.length || 1)) *
                        100
                    )}
                    %
                  </span>
                </div>

                {/* Bar */}
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
                    style={{
                      width: `${
                        ((progressList.filter((p) => p.status === 'done' || p.status === 'error').length) /
                          (items.length || 1)) *
                        100
                      }%`,
                    }}
                  />
                </div>

                {running && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                    Current Step: <strong className="text-zinc-800 dark:text-zinc-200">{currentStepName}</strong> on{' '}
                    {items[currentIndex]?.filename}
                  </p>
                )}
              </div>

              {/* Metrics Summary Badge */}
              {completed && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center space-y-0.5">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                      Processed
                    </span>
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      {progressList.filter((p) => p.status === 'done').length} / {items.length}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center space-y-0.5">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                      Output Size
                    </span>
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      {formatBytes(totalOutputSize)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center space-y-0.5">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                      Size Reduction
                    </span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {savingsPct > 0 ? `-${savingsPct}%` : 'Optimal'}
                    </span>
                  </div>
                </div>
              )}

              {/* Item by Item Log */}
              <div className="max-h-60 overflow-y-auto space-y-1 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                {progressList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {item.status === 'done' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : item.status === 'processing' ? (
                        <Loader2 className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 animate-spin shrink-0" />
                      ) : item.status === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0" />
                      )}
                      <span className="truncate">{item.filename}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                      <span className="text-zinc-500">{formatBytes(item.originalSize)}</span>
                      {item.processedSize && (
                        <>
                          <span className="text-zinc-400">→</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                            {formatBytes(item.processedSize)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div>
            {items.length > 0 && !completed && (
              <span className="text-xs text-zinc-400">
                Total input: <strong className="text-zinc-200">{formatBytes(totalInputSize)}</strong> across{' '}
                {items.length} images.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!running && !completed && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={handleRunBatch}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Recipe ({items.length} Images)</span>
                </button>
              </>
            )}

            {completed && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download All as ZIP</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Asset Picker for multi-selection */}
      <AssetPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multiSelect={true}
        onSelect={(assets) => {
          if (assets.length > 0) {
            handleSelectAssetsFromLibrary(assets);
          }
          setPickerOpen(false);
        }}
        title="Add Images for Batch Recipe"
        description="Pick one or dozens of photos from your library to apply the recipe."
      />
    </div>
  );
};
