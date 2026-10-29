import React, { useState } from 'react';
import { Minimize2, AlertTriangle, Download, Sparkles, Sliders, Target } from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import { ProcessingResultPanel } from '@/components/common/ProcessingResultPanel';
import { canvasProcessor, ProcessedOutput } from '@/services/image-processing/canvasProcessor';
import { QualityInspector } from './QualityInspector';
import { ImageAsset } from '@/types';
import { toast } from 'sonner';

export const CompressorPage: React.FC = () => {
  const [format, setFormat] = useState<'image/webp' | 'image/jpeg' | 'image/png'>('image/webp');
  const [quality, setQuality] = useState<number>(80);
  const [mode, setMode] = useState<'quality' | 'target'>('quality');
  const [targetKB, setTargetKB] = useState<number>(300);

  const [processing, setProcessing] = useState(false);
  const [liveOutput, setLiveOutput] = useState<ProcessedOutput | null>(null);
  const [result, setResult] = useState<{
    blob: Blob;
    width: number;
    height: number;
  } | null>(null);

  const handleProcess = async (asset: ImageAsset | null, blob: Blob | null) => {
    if (!asset || !blob) {
      toast.error('Please select an image first');
      return;
    }

    setProcessing(true);
    try {
      if (liveOutput) {
        setResult(liveOutput);
      } else {
        let output;
        if (mode === 'target' && (format === 'image/jpeg' || format === 'image/webp')) {
          output = await canvasProcessor.approximateTargetSize(blob, targetKB, format);
        } else {
          output = await canvasProcessor.compressImage(blob, format, quality / 100);
        }
        setResult(output);
      }
      toast.success('Ready to save or export');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Compression failed');
    } finally {
      setProcessing(false);
    }
  };

  const isAlphaPngToJpeg = (asset: ImageAsset | null) => {
    return asset && asset.mimeType === 'image/png' && format === 'image/jpeg';
  };

  return (
    <ToolLayout
      title="Image Compressor & Quality Inspector"
      description="Inspect compression artifacts, zoom into fine details, compare before & after, and balance file size with visual quality."
      icon={Minimize2}
      onClear={() => {
        setResult(null);
        setLiveOutput(null);
      }}
      previewContent={(selectedAsset, blob) => {
        if (!selectedAsset || !blob) return null;
        return (
          <QualityInspector
            originalBlob={blob}
            sourceAsset={selectedAsset}
            format={format}
            quality={quality}
            mode={mode}
            targetKB={targetKB}
            onQualityChange={(newQ) => setQuality(newQ)}
            onFormatChange={(newFmt) => setFormat(newFmt)}
            onProcessedUpdate={(out) => setLiveOutput(out)}
          />
        );
      }}
    >
      {(selectedAsset, blob) => (
        <div className="space-y-5 p-5 rounded-2xl bg-[#141419] border border-[#23232c] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#23232c]">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-lime-400" />
              Compression Settings
            </h3>
          </div>

          {/* Output Format Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Target Output Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['image/webp', 'image/jpeg', 'image/png'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase border transition-all ${
                    format === fmt
                      ? 'bg-lime-400/15 border-lime-400 text-lime-400 shadow-sm'
                      : 'bg-[#0e0e12] border-[#252530] text-zinc-400 hover:text-zinc-200 hover:bg-[#16161d]'
                  }`}
                >
                  {fmt.replace('image/', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Transparency Warning */}
          {isAlphaPngToJpeg(selectedAsset) && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                JPEG does not support transparency. Transparent areas will be rendered on a white background. Consider <strong>WebP</strong> to keep transparency.
              </p>
            </div>
          )}

          {/* Mode Switcher: Quality Slider vs Target Size */}
          {format !== 'image/png' && (
            <div className="space-y-3 pt-2 border-t border-[#23232c]">
              <div className="flex items-center gap-2 p-1 rounded-lg bg-[#0e0e12] border border-[#23232c]">
                <button
                  type="button"
                  onClick={() => setMode('quality')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    mode === 'quality'
                      ? 'bg-zinc-800 text-lime-400 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Quality Slider
                </button>
                <button
                  type="button"
                  onClick={() => setMode('target')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    mode === 'target'
                      ? 'bg-zinc-800 text-lime-400 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Target File Size
                </button>
              </div>

              {mode === 'quality' ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Compression Quality</span>
                    <span className="font-mono font-bold text-lime-400">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="1"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-lime-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Smaller Size</span>
                    <span>Balanced (80%)</span>
                    <span>Max Quality</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-lime-400" />
                      Target Size
                    </span>
                    <span className="font-mono font-bold text-lime-400">{targetKB} KB</span>
                  </div>
                  <input
                    type="number"
                    min="10"
                    max="15000"
                    value={targetKB}
                    onChange={(e) => setTargetKB(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#242430] text-xs text-zinc-100 font-mono focus:outline-none focus:border-lime-400"
                  />
                </div>
              )}
            </div>
          )}

          {format === 'image/png' && (
            <div className="p-3 rounded-lg bg-[#0e0e12] border border-[#20202a] text-xs text-zinc-400 leading-relaxed">
              PNG uses lossless compression to retain transparent pixels and crisp line graphics.
            </div>
          )}

          {/* Process Button */}
          <button
            disabled={!selectedAsset || processing}
            onClick={() => handleProcess(selectedAsset, blob)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-black" />
                <span>Preparing Output...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save & Export Inspected Image</span>
              </>
            )}
          </button>

          {/* Result Panel Modal Trigger */}
          {result && (
            <ProcessingResultPanel
              sourceAsset={selectedAsset}
              resultBlob={result.blob}
              outputWidth={result.width}
              outputHeight={result.height}
              variantType="compressed"
              metadata={{
                format,
                quality: mode === 'quality' ? quality : undefined,
                targetKB: mode === 'target' ? targetKB : undefined,
              }}
              onClose={() => setResult(null)}
            />
          )}
        </div>
      )}
    </ToolLayout>
  );
};
