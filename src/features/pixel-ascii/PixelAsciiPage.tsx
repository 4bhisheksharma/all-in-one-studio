import React, { useState, useEffect } from 'react';
import {
  Grid,
  Terminal,
  Download,
  Copy,
  Check,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import {
  pixelAsciiService,
  RetroPalette,
  PALETTES,
  ASCII_RAMPS,
  PixelArtOptions,
  AsciiArtOptions,
} from '@/services/image-processing/pixelAsciiService';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { ImageAsset } from '@/types';
import { formatBytes } from '@/utils/cn';
import { toast } from 'sonner';

export const PixelAsciiPage: React.FC = () => {
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);

  // Mode: 'pixel' or 'ascii'
  const [activeTab, setActiveTab] = useState<'pixel' | 'ascii'>('pixel');

  // Pixel Art State
  const [pixelSize, setPixelSize] = useState<number>(8);
  const [palette, setPalette] = useState<RetroPalette>('gameboy');
  const [dither, setDither] = useState<boolean>(true);
  const [sharpBorders, setSharpBorders] = useState<boolean>(false);

  // ASCII Art State
  const [columns, setColumns] = useState<number>(80);
  const [ramp, setRamp] = useState<string>('standard');
  const [invert, setInvert] = useState<boolean>(false);
  const [colorMode, setColorMode] = useState<'monochrome' | 'color'>('color');

  // Preview Outputs
  const [pixelCanvas, setPixelCanvas] = useState<HTMLCanvasElement | null>(null);
  const [asciiResult, setAsciiResult] = useState<{
    text: string;
    lines: string[];
    width: number;
    height: number;
    colors: string[][];
  } | null>(null);
  const [asciiCanvas, setAsciiCanvas] = useState<HTMLCanvasElement | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const syncImage = (blob: Blob | null) => {
    if (!blob) {
      setLoadedImg(null);
      setPixelCanvas(null);
      setAsciiResult(null);
      setAsciiCanvas(null);
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

  // Re-generate Pixel Art or ASCII Art
  useEffect(() => {
    if (!loadedImg) return;

    let isMounted = true;
    setIsProcessing(true);

    const run = async () => {
      try {
        if (activeTab === 'pixel') {
          const options: PixelArtOptions = {
            pixelSize,
            palette,
            dither,
            sharpBorders,
          };
          const canvas = await pixelAsciiService.renderPixelArt(loadedImg, options);
          if (!isMounted) return;

          setPixelCanvas(canvas);
          canvas.toBlob((b) => {
            if (isMounted && b) setResultBlob(b);
          }, 'image/png');
        } else {
          const options: AsciiArtOptions = {
            columns,
            ramp,
            invert,
            colorMode,
          };
          const asciiData = pixelAsciiService.generateAsciiText(loadedImg, options);
          if (!isMounted) return;
          setAsciiResult(asciiData);

          const canvas = pixelAsciiService.renderAsciiToCanvas(asciiData, { colorMode });
          if (!isMounted) return;
          setAsciiCanvas(canvas);

          canvas.toBlob((b) => {
            if (isMounted && b) setResultBlob(b);
          }, 'image/png');
        }
      } catch (err) {
        console.error('Failed to generate pixel/ascii art:', err);
      } finally {
        if (isMounted) setIsProcessing(false);
      }
    };

    const timer = setTimeout(run, 50);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [loadedImg, activeTab, pixelSize, palette, dither, sharpBorders, columns, ramp, invert, colorMode]);

  const handleCopyAscii = async () => {
    if (!asciiResult) return;
    try {
      await navigator.clipboard.writeText(asciiResult.text);
      setCopied(true);
      toast.success('ASCII text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownloadTxt = (selectedAsset: ImageAsset | null) => {
    if (!asciiResult) return;
    const blob = new Blob([asciiResult.text], { type: 'text/plain;charset=utf-8' });
    const base = selectedAsset?.filename ? selectedAsset.filename.replace(/\.[^/.]+$/, '') : 'ascii-art';
    const filename = `${base}.txt`;
    downloadService.downloadBlob(blob, filename);
    toast.success('Downloaded ASCII text file');
  };

  const handleDownloadImage = (selectedAsset: ImageAsset | null) => {
    if (!resultBlob) return;
    const suffix = activeTab === 'pixel' ? 'pixel-art' : 'ascii-render';
    const base = selectedAsset?.filename ? selectedAsset.filename.replace(/\.[^/.]+$/, '') : 'art';
    const filename = `${base}-${suffix}.png`;
    downloadService.downloadBlob(resultBlob, filename);
    toast.success('Downloaded image');
  };

  const handleSaveToLibrary = async (selectedAsset: ImageAsset | null) => {
    if (!resultBlob) return;
    try {
      const suffix = activeTab === 'pixel' ? 'pixel-art' : 'ascii-render';
      const base = selectedAsset?.filename ? selectedAsset.filename.replace(/\.[^/.]+$/, '') : 'art';
      const filename = `${base}-${suffix}.png`;
      await assetService.saveProcessedImage(
        selectedAsset ? selectedAsset.id : null,
        resultBlob,
        'other',
        { activeTab, palette: activeTab === 'pixel' ? palette : ramp },
        selectedAsset ? selectedAsset.projectId : null,
        filename,
        `Retro ${activeTab === 'pixel' ? 'Pixel Art' : 'ASCII Art'}`,
        'pixel-ascii'
      );
      toast.success('Saved to Library');
    } catch {
      toast.error('Failed to save to Library');
    }
  };

  return (
    <ToolLayout
      title="Pixel Art & Retro ASCII Studio"
      description="Convert graphics into authentic 8-bit retro pixel art with classic console palettes, or generate ASCII text."
      icon={Terminal}
      onClear={() => {
        setLoadedImg(null);
        setPixelCanvas(null);
        setAsciiResult(null);
        setAsciiCanvas(null);
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
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {activeTab === 'pixel' ? 'Pixel Art View' : 'ASCII Terminal Output'}
                </span>
                {isProcessing ? (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Processing
                  </span>
                ) : activeTab === 'pixel' && pixelCanvas ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400">
                    {pixelCanvas.width} × {pixelCanvas.height} px
                  </span>
                ) : activeTab === 'ascii' && asciiResult ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400">
                    {asciiResult.width} cols × {asciiResult.height} rows
                  </span>
                ) : null}
              </div>

              {resultBlob && (
                <div className="flex items-center gap-2 flex-wrap">
                  {activeTab === 'ascii' && asciiResult && (
                    <>
                      <button
                        type="button"
                        onClick={handleCopyAscii}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy Text'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadTxt(selectedAsset)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.TXT</span>
                      </button>
                    </>
                  )}
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
                    onClick={() => handleDownloadImage(selectedAsset)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG ({formatBytes(resultBlob.size)})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Canvas Display Viewport */}
            <div className="flex-1 flex items-center justify-center min-h-[320px] sm:min-h-[460px] lg:min-h-[580px] p-2 sm:p-4 rounded-xl bg-zinc-950 border border-zinc-900 overflow-auto">
              {activeTab === 'pixel' && (
                pixelCanvas ? (
                  <img
                    src={pixelCanvas.toDataURL()}
                    alt="Pixel Art"
                    style={{ imageRendering: 'pixelated' }}
                    className="max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
                  />
                ) : (
                  <div className="text-center space-y-2 py-16 text-zinc-500">
                    <Grid className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
                    <p className="text-xs">Select or upload an image to generate pixel art</p>
                  </div>
                )
              )}

              {activeTab === 'ascii' && (
                asciiCanvas ? (
                  <img
                    src={asciiCanvas.toDataURL()}
                    alt="ASCII Canvas"
                    className="max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
                  />
                ) : (
                  <div className="text-center space-y-2 py-16 text-zinc-500">
                    <Terminal className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
                    <p className="text-xs">Select or upload an image to extract ASCII text</p>
                  </div>
                )
              )}
            </div>
          </div>
        );
      }}
    >
      {() => (
        <div className="space-y-4">
          {/* Mode Switcher */}
          <div className="p-1.5 rounded-xl bg-zinc-100 dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] grid grid-cols-2 gap-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('pixel')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'pixel'
                  ? 'bg-white dark:bg-[#1f1f24] text-zinc-950 dark:text-zinc-100 shadow-sm font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Pixel Art</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ascii')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'ascii'
                  ? 'bg-white dark:bg-[#1f1f24] text-zinc-950 dark:text-zinc-100 shadow-sm font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>ASCII Terminal</span>
            </button>
          </div>

          {/* PIXEL CONTROLS */}
          {activeTab === 'pixel' && (
            <>
              {/* Pixel Block Size */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3 shadow-xs">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Pixel Downscale</span>
                  <span className="font-mono text-zinc-500 dark:text-zinc-400">{pixelSize}px block</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={32}
                  step={2}
                  value={pixelSize}
                  onChange={(e) => setPixelSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                  <span>Fine (2px)</span>
                  <span>Retro (8px)</span>
                  <span>Chunky (32px)</span>
                </div>
              </div>

              {/* Console & Retro Palettes */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3 shadow-xs">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Color Quantization Palette
                </span>
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {(Object.keys(PALETTES) as RetroPalette[]).map((key) => {
                    const pal = PALETTES[key];
                    const isSelected = palette === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPalette(key)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'border-zinc-950 bg-zinc-50/80 dark:border-zinc-100 dark:bg-zinc-800/40 text-zinc-950 dark:text-zinc-100 font-medium ring-1 ring-zinc-950 dark:ring-zinc-100'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <span className="truncate">{pal.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {pal.colors.length > 0 ? (
                            pal.colors.slice(0, 5).map((c, i) => (
                              <span
                                key={i}
                                className="w-3.5 h-3.5 rounded-sm border border-black/20"
                                style={{ backgroundColor: c.hex }}
                              />
                            ))
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-mono">Full Spectrum</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dithering & Grid Options */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3 shadow-xs">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Rendering Quality
                </span>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer">
                  <div className="space-y-0.5 pr-2">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Floyd-Steinberg Dithering</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Diffuses color error for smooth shading</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={dither}
                    onChange={(e) => setDither(e.target.checked)}
                    className="w-4 h-4 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer">
                  <div className="space-y-0.5 pr-2">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Pixel Grid Borders</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Emphasizes pixel lines for blueprint look</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sharpBorders}
                    onChange={(e) => setSharpBorders(e.target.checked)}
                    className="w-4 h-4 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                  />
                </label>
              </div>
            </>
          )}

          {/* ASCII CONTROLS */}
          {activeTab === 'ascii' && (
            <>
              {/* Columns Resolution */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3 shadow-xs">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Columns Density</span>
                  <span className="font-mono text-zinc-500 dark:text-zinc-400">{columns} cols</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={160}
                  step={10}
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                  <span>Compact (40)</span>
                  <span>Terminal (80)</span>
                  <span>Dense (160)</span>
                </div>
              </div>

              {/* Character Ramp */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3 shadow-xs">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Character Shading Set
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ASCII_RAMPS).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRamp(key)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        ramp === key
                          ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                      }`}
                    >
                      <p className="font-medium truncate">{val.label}</p>
                      <p className="font-mono text-[10px] opacity-70 mt-1 truncate">{val.chars}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Appearance & Color Mode */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3 shadow-xs">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Terminal Appearance
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setColorMode('color')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                      colorMode === 'color'
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Full Color RGB
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode('monochrome')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                      colorMode === 'monochrome'
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Monochrome Green
                  </button>
                </div>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer">
                  <div className="space-y-0.5 pr-2">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Invert Luminance</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Swap dark and bright character shades</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={invert}
                    onChange={(e) => setInvert(e.target.checked)}
                    className="w-4 h-4 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                  />
                </label>
              </div>
            </>
          )}
        </div>
      )}
    </ToolLayout>
  );
};
