import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Smartphone,
  Globe,
  Sliders,
  Sparkles,
  Download,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import {
  mockupService,
  MockupOptions,
  MockupFrameStyle,
  MockupAspectRatio,
  MockupBackground,
  MockupShadow,
  MOCKUP_PRESETS,
} from '@/services/image-processing/mockupService';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { ImageAsset } from '@/types';
import { formatBytes } from '@/utils/cn';
import { toast } from 'sonner';

export const MockupPage: React.FC = () => {
  const [frameStyle, setFrameStyle] = useState<MockupFrameStyle>('browser-dark');
  const [aspectRatio, setAspectRatio] = useState<MockupAspectRatio>('product-hunt');
  const [background, setBackground] = useState<MockupBackground>('gradient-indigo');
  const [padding, setPadding] = useState<number>(48);
  const [shadow, setShadow] = useState<MockupShadow>('dramatic');
  const [cornerRadius, setCornerRadius] = useState<number>(16);
  const [browserUrl, setBrowserUrl] = useState<string>('app.myproduct.com');
  const [scale, setScale] = useState<number>(1);

  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultDimensions, setResultDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Sync loaded image whenever blob changes in ToolLayout
  const syncImage = (blob: Blob | null) => {
    if (!blob) {
      setLoadedImg(null);
      setPreviewCanvas(null);
      setResultBlob(null);
      return;
    }

    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLoadedImg(img);
    };
    img.src = url;
  };

  // Re-render mockup on canvas when options or image change
  useEffect(() => {
    if (!loadedImg) return;

    let isMounted = true;
    setIsRendering(true);

    const render = async () => {
      try {
        const options: MockupOptions = {
          frameStyle,
          aspectRatio,
          background,
          padding,
          shadow,
          cornerRadius,
          browserUrl,
          scale,
        };

        const canvas = await mockupService.renderMockup(loadedImg, options);
        if (!isMounted) return;

        setPreviewCanvas(canvas);
        setResultDimensions({ width: canvas.width, height: canvas.height });

        canvas.toBlob((blob) => {
          if (isMounted && blob) {
            setResultBlob(blob);
          }
        }, 'image/png');
      } catch (err) {
        console.error('Failed to render mockup:', err);
      } finally {
        if (isMounted) setIsRendering(false);
      }
    };

    const timer = setTimeout(render, 40);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [loadedImg, frameStyle, aspectRatio, background, padding, shadow, cornerRadius, browserUrl, scale]);

  const handleApplyPreset = (preset: typeof MOCKUP_PRESETS[0]) => {
    setFrameStyle(preset.options.frameStyle);
    setAspectRatio(preset.options.aspectRatio);
    setBackground(preset.options.background);
    setPadding(preset.options.padding);
    setShadow(preset.options.shadow);
    setCornerRadius(preset.options.cornerRadius);
    setBrowserUrl(preset.options.browserUrl);
    setScale(preset.options.scale);
    toast.success(`Applied preset: ${preset.name}`);
  };

  const handleDownload = (selectedAsset: ImageAsset | null) => {
    if (!resultBlob) return;
    const base = selectedAsset?.filename ? selectedAsset.filename.replace(/\.[^/.]+$/, '') : 'mockup';
    const filename = `${base}-frame.png`;
    downloadService.downloadBlob(resultBlob, filename);
    toast.success('Mockup downloaded');
  };

  const handleSaveToLibrary = async (selectedAsset: ImageAsset | null) => {
    if (!resultBlob) return;
    try {
      const base = selectedAsset?.filename ? selectedAsset.filename.replace(/\.[^/.]+$/, '') : 'mockup';
      const filename = `${base}-frame.png`;
      await assetService.saveProcessedImage(
        selectedAsset ? selectedAsset.id : null,
        resultBlob,
        'other',
        { frameStyle, aspectRatio, background },
        selectedAsset ? selectedAsset.projectId : null,
        filename,
        `Device frame mockup (${frameStyle})`,
        'mockups'
      );
      toast.success('Saved mockup to Library');
    } catch {
      toast.error('Failed to save mockup to library');
    }
  };

  return (
    <ToolLayout
      title="Device Frame & Mockup Studio"
      description="Frame screenshots in polished browser chrome, smartphone frames, and elegant backdrop gradients."
      icon={Laptop}
      onClear={() => {
        setLoadedImg(null);
        setPreviewCanvas(null);
        setResultBlob(null);
      }}
      previewContent={(selectedAsset, blob) => {
        if (blob && (!loadedImg || loadedImg.src !== blob.type)) {
          syncImage(blob);
        } else if (!blob && loadedImg) {
          syncImage(null);
        }

        return (
          <div className="w-full h-full flex flex-col justify-between p-3 sm:p-5 select-none space-y-4">
            {/* Viewport Action Header Bar */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/70 dark:border-zinc-800/70">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Live Mockup View</span>
                {isRendering ? (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Rendering
                  </span>
                ) : resultDimensions.width > 0 ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400">
                    {resultDimensions.width} × {resultDimensions.height} px
                  </span>
                ) : null}
              </div>

              {previewCanvas && resultBlob && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSaveToLibrary(selectedAsset)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Save to Library</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(selectedAsset)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG ({formatBytes(resultBlob.size)})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Canvas Display Viewport */}
            <div className="flex-1 flex items-center justify-center min-h-[320px] sm:min-h-[460px] lg:min-h-[580px] p-2 sm:p-4 rounded-xl bg-zinc-950/5 dark:bg-black/30 border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
              {previewCanvas ? (
                <div className="relative max-h-full max-w-full flex items-center justify-center">
                  <img
                    src={previewCanvas.toDataURL()}
                    alt="Mockup Preview"
                    className="max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-xl transition-all"
                  />
                </div>
              ) : (
                <div className="text-center space-y-2 py-16 text-zinc-400 dark:text-zinc-500">
                  <Laptop className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
                  <p className="text-xs">Select or upload an image to generate mockup</p>
                </div>
              )}
            </div>
          </div>
        );
      }}
    >
      {() => (
        <div className="space-y-4">
          {/* Quick Presets */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3 shadow-xs">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
              Quick Presets
            </span>
            <div className="grid grid-cols-2 gap-2">
              {MOCKUP_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-left hover:border-zinc-400 dark:hover:border-zinc-600 transition-all text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer"
                >
                  <p className="truncate font-medium">{preset.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Frame Style */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3 shadow-xs">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-zinc-500" />
              Frame Chrome
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
              {[
                { id: 'browser-dark', label: 'Dark Browser', icon: Globe },
                { id: 'browser-light', label: 'Light Browser', icon: Globe },
                { id: 'browser-minimal', label: 'Minimalist', icon: Globe },
                { id: 'phone-modern', label: 'Smartphone', icon: Smartphone },
                { id: 'laptop-modern', label: 'Laptop Display', icon: Laptop },
                { id: 'glass-card', label: 'Floating Card', icon: Sliders },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setFrameStyle(style.id as MockupFrameStyle)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    frameStyle === style.id
                      ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-700'
                  }`}
                >
                  <style.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{style.label}</span>
                </button>
              ))}
            </div>

            {/* Address Bar URL for Browsers */}
            {(frameStyle === 'browser-dark' || frameStyle === 'browser-light') && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Browser Address URL
                </label>
                <input
                  type="text"
                  value={browserUrl}
                  onChange={(e) => setBrowserUrl(e.target.value)}
                  placeholder="app.myproduct.com"
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono"
                />
              </div>
            )}
          </div>

          {/* Backdrop Background */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3 shadow-xs">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Canvas Backdrop
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
              {[
                { id: 'gradient-indigo', label: 'Indigo Glow', color: 'from-indigo-950 to-slate-900' },
                { id: 'gradient-sunset', label: 'Sunset Aura', color: 'from-orange-400 to-rose-400' },
                { id: 'gradient-cyber', label: 'Cyber Violet', color: 'from-violet-950 to-cyan-950' },
                { id: 'gradient-emerald', label: 'Deep Emerald', color: 'from-emerald-950 to-teal-900' },
                { id: 'gradient-slate', label: 'Obsidian Slate', color: 'from-slate-800 to-slate-950' },
                { id: 'solid-dark', label: 'Solid Dark', color: 'bg-zinc-950' },
                { id: 'solid-light', label: 'Solid Light', color: 'bg-zinc-200' },
                { id: 'transparent', label: 'Transparent', color: 'bg-zinc-500/20' },
              ].map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setBackground(bg.id as MockupBackground)}
                  className={`p-2 rounded-lg border text-[11px] font-medium transition-all text-center cursor-pointer ${
                    background === bg.id
                      ? 'border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div className={`w-full h-3.5 rounded mb-1 bg-gradient-to-r ${bg.color} border border-black/10`} />
                  <span className="truncate block">{bg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Geometry & Padding Slider */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3.5 shadow-xs">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Geometry & Shadows
            </span>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Aspect Ratio Output
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'auto', label: 'Auto Fit' },
                  { id: '16:9', label: '16:9' },
                  { id: '1:1', label: '1:1 Square' },
                  { id: '4:3', label: '4:3' },
                  { id: 'twitter', label: 'Twitter/X' },
                  { id: 'product-hunt', label: 'Product Hunt' },
                ].map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => setAspectRatio(ar.id as MockupAspectRatio)}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                      aspectRatio === ar.id
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Padding slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">Backdrop Padding</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">{padding}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={128}
                step={8}
                value={padding}
                onChange={(e) => setPadding(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
              />
            </div>

            {/* Drop Shadow */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Drop Shadow
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'subtle', label: 'Subtle' },
                  { id: 'elevated', label: 'Elevated' },
                  { id: 'dramatic', label: 'Dramatic' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShadow(s.id as MockupShadow)}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                      shadow === s.id
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Corner Radius */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">Corner Radius</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">{cornerRadius}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={48}
                step={2}
                value={cornerRadius}
                onChange={(e) => setCornerRadius(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
              />
            </div>

            {/* Resolution Scale */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Resolution Scale</span>
              <div className="flex items-center gap-1.5">
                {[1, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScale(s)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium border cursor-pointer ${
                      scale === s
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};
