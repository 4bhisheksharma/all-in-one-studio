import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Layers,
  Play,
  Pause,
  Download,
  FolderPlus,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Archive,
  Image as ImageIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AssetPickerDialog } from '@/components/image-picker/AssetPickerDialog';
import {
  gifStudioService,
  GifFrameItem,
  GifCreateOptions,
  ExtractedGifFrame,
} from '@/services/image-processing/gifStudioService';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { ImageAsset } from '@/types';
import { formatBytes } from '@/utils/cn';
import { toast } from 'sonner';

export const GifStudioPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'decompose'>('create');

  // CREATOR STATE
  const [frames, setFrames] = useState<GifFrameItem[]>([]);
  const [fps, setFps] = useState<number>(10);
  const [loop, setLoop] = useState<number>(0); // 0 = infinite
  const [maxDimension, setMaxDimension] = useState<number>(480);
  const [qualityColors] = useState<number>(256);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateProgress, setGenerateProgress] = useState<number>(0);
  const [generatedGifBlob, setGeneratedGifBlob] = useState<Blob | null>(null);

  // DECOMPOSER STATE
  const [decomposing, setDecomposing] = useState<boolean>(false);
  const [extractedFrames, setExtractedFrames] = useState<ExtractedGifFrame[]>([]);
  const [selectedGifName, setSelectedGifName] = useState<string>('');

  // Dialog State
  const [assetPickerOpen, setAssetPickerOpen] = useState<boolean>(false);
  const [assetPickerMode, setAssetPickerMode] = useState<'creator-add' | 'decomposer-select'>('creator-add');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);

  // Frame animation loop in creator player
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;

    const delay = Math.round(1000 / fps);
    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
    }, delay);

    return () => clearInterval(interval);
  }, [isPlaying, fps, frames.length]);

  // Handle files added to creator
  const addFramesFromAssets = async (assets: ImageAsset[]) => {
    const newItems: GifFrameItem[] = [];

    for (const asset of assets) {
      const blob = await assetService.getAssetBlob(asset.id);
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          newItems.push({
            id: `${asset.id}-${Date.now()}-${Math.random()}`,
            source: img,
            previewUrl: url,
            name: asset.filename,
          });
          resolve();
        };
        img.src = url;
      });
    }

    if (newItems.length > 0) {
      setFrames((prev) => [...prev, ...newItems]);
      toast.success(`Added ${newItems.length} frames to GIF`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedCount = 0;
    const newItems: GifFrameItem[] = [];

    fileList.forEach((file) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          source: img,
          previewUrl: url,
          name: file.name,
        });
        loadedCount++;
        if (loadedCount === fileList.length) {
          setFrames((prev) => [...prev, ...newItems]);
          toast.success(`Imported ${newItems.length} frames`);
        }
      };
      img.src = url;
    });
  };

  // Move frame in sequence
  const moveFrame = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= frames.length) return;

    const nextFrames = [...frames];
    const [moved] = nextFrames.splice(index, 1);
    nextFrames.splice(targetIdx, 0, moved);
    setFrames(nextFrames);
  };

  // Remove frame
  const removeFrame = (index: number) => {
    const nextFrames = frames.filter((_, i) => i !== index);
    setFrames(nextFrames);
    if (currentFrameIndex >= nextFrames.length) {
      setCurrentFrameIndex(Math.max(0, nextFrames.length - 1));
    }
  };

  // Build Animated GIF
  const handleGenerateGif = async () => {
    if (frames.length === 0) {
      toast.error('Add at least one image frame to generate a GIF');
      return;
    }

    setIsGenerating(true);
    setGenerateProgress(0);

    try {
      const options: GifCreateOptions = {
        fps,
        loop,
        maxDimension,
        qualityColors,
      };

      const gifBlob = await gifStudioService.createAnimatedGif(frames, options, (p) => {
        setGenerateProgress(p);
      });

      setGeneratedGifBlob(gifBlob);
      toast.success(`GIF generated successfully! (${formatBytes(gifBlob.size)})`);
    } catch (err) {
      console.error('Failed to create GIF:', err);
      toast.error('Failed to encode animated GIF');
    } finally {
      setIsGenerating(false);
      setGenerateProgress(0);
    }
  };

  // Download Created GIF
  const handleDownloadGif = () => {
    if (!generatedGifBlob) return;
    downloadService.downloadBlob(generatedGifBlob, 'animation.gif');
    toast.success('Downloaded animated GIF');
  };

  // Save Created GIF to Library
  const handleSaveGifToLibrary = async () => {
    if (!generatedGifBlob) return;
    try {
      await assetService.saveProcessedImage(
        null,
        generatedGifBlob,
        'other',
        { fps, loop, maxDimension },
        null,
        'animation.gif',
        `Generated GIF (${frames.length} frames, ${fps} fps)`,
        'gif-studio'
      );
      toast.success('Saved animated GIF to Library');
    } catch {
      toast.error('Failed to save to Library');
    }
  };

  // Decompose GIF
  const handleDecomposeGifBlob = async (blob: Blob, name: string) => {
    setDecomposing(true);
    setSelectedGifName(name);
    try {
      const extracted = await gifStudioService.extractFramesFromGif(blob);
      setExtractedFrames(extracted);
      toast.success(`Decomposed GIF into ${extracted.length} individual frames!`);
    } catch (err) {
      console.error('Failed to decompose GIF:', err);
      toast.error('Failed to read GIF frames. Ensure file is a valid animated GIF.');
    } finally {
      setDecomposing(false);
    }
  };

  const handleGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleDecomposeGifBlob(file, file.name);
  };

  // Download All Extracted Frames as ZIP
  const handleDownloadAllFramesZip = async () => {
    if (extractedFrames.length === 0) return;
    try {
      const zipBlob = await gifStudioService.bundleFramesZip(extractedFrames);
      downloadService.downloadBlob(zipBlob, `${selectedGifName.replace(/\.[^/.]+$/, '')}-frames.zip`);
      toast.success('Downloaded frames ZIP');
    } catch {
      toast.error('Failed to create ZIP');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Animated GIF Maker & Frame Decomposer"
        description="Assemble burst photos and images into smooth animated GIFs, or extract and download all individual frames from existing GIFs."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'create' && generatedGifBlob && (
              <>
                <button
                  type="button"
                  onClick={handleSaveGifToLibrary}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Save to Library</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadGif}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download GIF ({formatBytes(generatedGifBlob.size)})</span>
                </button>
              </>
            )}

            {activeTab === 'decompose' && extractedFrames.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadAllFramesZip}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium shadow-sm transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Download All Frames ({extractedFrames.length}) as ZIP</span>
              </button>
            )}
          </div>
        }
      />

      {/* Mode Tabs */}
      <div className="p-1.5 rounded-xl bg-zinc-100 dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] grid grid-cols-2 gap-1.5 w-full sm:max-w-md">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'create'
              ? 'bg-white dark:bg-[#1f1f24] text-zinc-950 dark:text-zinc-100 shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Create Animated GIF</span>
        </button>
        <button
          onClick={() => setActiveTab('decompose')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'decompose'
              ? 'bg-white dark:bg-[#1f1f24] text-zinc-950 dark:text-zinc-100 shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Extract GIF Frames</span>
        </button>
      </div>

      {/* TAB 1: CREATE ANIMATED GIF */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls & Sequence Tray */}
          <div className="lg:col-span-5 space-y-5">
            {/* Action Bar to Add Frames */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Animation Sequence ({frames.length} frames)
                </span>
                {frames.length > 0 && (
                  <button
                    onClick={() => setFrames([])}
                    className="text-[11px] text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAssetPickerMode('creator-add');
                    setAssetPickerOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>From Library</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Images</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Frames Sequence List */}
              <div className="max-h-[260px] overflow-y-auto space-y-1.5 pt-1 pr-1">
                {frames.map((frame, idx) => (
                  <div
                    key={frame.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                      currentFrameIndex === idx
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/60 font-medium'
                        : 'border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        #{idx + 1}
                      </span>
                      <img
                        src={frame.previewUrl}
                        alt="Frame"
                        className="w-7 h-7 object-cover rounded border border-black/10 shrink-0"
                      />
                      <span className="truncate text-zinc-800 dark:text-zinc-200">{frame.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveFrame(idx, 'left')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 disabled:opacity-20 cursor-pointer"
                        title="Move Earlier"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveFrame(idx, 'right')}
                        disabled={idx === frames.length - 1}
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 disabled:opacity-20 cursor-pointer"
                        title="Move Later"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeFrame(idx)}
                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-500 cursor-pointer"
                        title="Delete Frame"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {frames.length === 0 && (
                  <div className="text-center py-8 text-zinc-400 text-xs">
                    No frames added yet. Add images above to assemble a GIF.
                  </div>
                )}
              </div>
            </div>

            {/* Animation Settings */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-4">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                GIF Parameters
              </span>

              {/* Framerate / FPS Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Playback Speed</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{fps} FPS ({Math.round(1000 / fps)}ms)</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                />
              </div>

              {/* Max Dimension */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Target Resolution Max Width
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 360, label: '360px' },
                    { id: 480, label: '480px' },
                    { id: 720, label: '720px' },
                    { id: 0, label: 'Original' },
                  ].map((dim) => (
                    <button
                      key={dim.id}
                      onClick={() => setMaxDimension(dim.id)}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                        maxDimension === dim.id
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {dim.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Looping Mode */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLoop(0)}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                    loop === 0
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Infinite Loop
                </button>
                <button
                  onClick={() => setLoop(1)}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                    loop === 1
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Play Once
                </button>
              </div>

              {/* Encode Action */}
              <button
                onClick={handleGenerateGif}
                disabled={frames.length === 0 || isGenerating}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Rendering GIF... ({generateProgress}%)</span>
                  </>
                ) : (
                  <>
                    <Film className="w-3.5 h-3.5" />
                    <span>Encode Animated GIF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Preview Player */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Animation Playback
                </span>
                {frames.length > 0 && (
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    Frame {currentFrameIndex + 1} of {frames.length}
                  </span>
                )}
              </div>

              {/* Visual Player Display */}
              <div className="mt-4 flex items-center justify-center min-h-[380px] max-h-[460px] bg-zinc-950 rounded-lg p-4 overflow-hidden border border-zinc-900">
                {frames.length > 0 && frames[currentFrameIndex] ? (
                  <img
                    src={frames[currentFrameIndex].previewUrl}
                    alt={`Frame ${currentFrameIndex + 1}`}
                    className="max-h-[400px] w-auto max-w-full object-contain rounded shadow-2xl"
                  />
                ) : (
                  <div className="text-center space-y-2 py-16 text-zinc-500">
                    <Film className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
                    <p className="text-xs">Add frames to preview animation</p>
                  </div>
                )}
              </div>

              {/* Player Controls */}
              {frames.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                      {isPlaying ? 'Playing' : 'Paused'}
                    </span>
                  </div>

                  {/* Scrubber slider */}
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, frames.length - 1)}
                    value={currentFrameIndex}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentFrameIndex(Number(e.target.value));
                    }}
                    className="w-full sm:w-1/2 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DECOMPOSE GIF TO FRAMES */}
      {activeTab === 'decompose' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Extract Frames from Existing GIF
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Upload any animated GIF file to break it down into high-resolution PNG frames with accurate timing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAssetPickerMode('decomposer-select');
                  setAssetPickerOpen(true);
                }}
                className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
              >
                Choose from Library
              </button>
              <button
                onClick={() => gifInputRef.current?.click()}
                className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium shadow-sm transition-colors cursor-pointer"
              >
                Upload GIF File
              </button>
              <input
                ref={gifInputRef}
                type="file"
                accept="image/gif"
                onChange={handleGifUpload}
                className="hidden"
              />
            </div>
          </div>

          {decomposing && (
            <div className="p-12 text-center space-y-3 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-500" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Decoding and extracting GIF frames...
              </p>
            </div>
          )}

          {/* Extracted Frames Gallery */}
          {extractedFrames.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Extracted Frames ({extractedFrames.length})
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {extractedFrames[0]?.width} × {extractedFrames[0]?.height} px
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {extractedFrames.map((frame) => (
                  <div
                    key={frame.index}
                    className="group relative p-2 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-2 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
                  >
                    <div className="relative aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                      <img
                        src={frame.dataUrl}
                        alt={`Frame ${frame.index}`}
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur-sm">
                        #{frame.index}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-zinc-500 font-mono text-[10px]">{frame.delayMs}ms</span>
                      <button
                        onClick={() => downloadService.downloadBlob(frame.blob, frame.filename)}
                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-pointer"
                        title="Download Frame"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Asset Picker Dialog */}
      <AssetPickerDialog
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        multiSelect={assetPickerMode === 'creator-add'}
        onSelect={async (selectedAssets) => {
          if (assetPickerMode === 'creator-add') {
            await addFramesFromAssets(selectedAssets);
          } else if (selectedAssets.length > 0) {
            const first = selectedAssets[0];
            const blob = await assetService.getAssetBlob(first.id);
            if (blob) {
              handleDecomposeGifBlob(blob, first.filename);
            }
          }
        }}
      />
    </div>
  );
};
