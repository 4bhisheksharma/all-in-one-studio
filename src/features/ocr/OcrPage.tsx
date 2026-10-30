import React, { useState, useEffect } from 'react';
import {
  FileText,
  Scan,
  Download,
  Copy,
  Check,
  Play,
  RefreshCw,
} from 'lucide-react';
import { ToolLayout } from '@/components/layout/ToolLayout';
import {
  ocrService,
  DocumentFilterType,
  OcrResult,
} from '@/services/image-processing/ocrService';
import { assetService } from '@/services/storage/assetService';
import { downloadService } from '@/services/export/downloadService';
import { ImageAsset } from '@/types';
import { toast } from 'sonner';

export const OcrPage: React.FC = () => {
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);

  const [filterType, setFilterType] = useState<DocumentFilterType>('binarize');
  const [showBoxes, setShowBoxes] = useState<boolean>(true);

  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isProcessingFilter, setIsProcessingFilter] = useState<boolean>(false);

  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [editableText, setEditableText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const syncImage = (blob: Blob | null) => {
    if (!blob) {
      setLoadedImg(null);
      setPreviewCanvas(null);
      setOcrResult(null);
      setEditableText('');
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

  // Re-run document filter on image change or filter change
  useEffect(() => {
    if (!loadedImg) return;

    let isMounted = true;
    setIsProcessingFilter(true);

    const applyFilter = async () => {
      try {
        const filtered = await ocrService.preprocessDocument(loadedImg, filterType);
        if (!isMounted) return;
        setPreviewCanvas(filtered);
      } catch (err) {
        console.error('Document filter error:', err);
      } finally {
        if (isMounted) setIsProcessingFilter(false);
      }
    };

    applyFilter();
    return () => {
      isMounted = false;
    };
  }, [loadedImg, filterType]);

  const handleRunOcr = async () => {
    if (!previewCanvas) {
      toast.error('Please upload or select a document first');
      return;
    }

    setIsExtracting(true);
    setProgress(5);
    setStatusMessage('Initializing OCR engine...');

    try {
      const res = await ocrService.recognizeText(previewCanvas, 'eng', (p, msg) => {
        setProgress(p);
        setStatusMessage(msg);
      });

      setOcrResult(res);
      setEditableText(res.text);
      toast.success(`OCR complete! Found ${res.wordCount} words (${res.confidence}% confidence)`);
    } catch (err) {
      console.error('OCR failed:', err);
      toast.error('OCR extraction failed. Try adjusting the document filter.');
    } finally {
      setIsExtracting(false);
      setProgress(0);
      setStatusMessage('');
    }
  };

  const handleCopy = async () => {
    if (!editableText) return;
    try {
      await navigator.clipboard.writeText(editableText);
      setCopied(true);
      toast.success('Text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownloadTxt = (selectedAsset: ImageAsset | null) => {
    if (!editableText) return;
    const blob = new Blob([editableText], { type: 'text/plain;charset=utf-8' });
    const base = selectedAsset?.filename ? selectedAsset.filename.replace(/\.[^/.]+$/, '') : 'document';
    const name = `${base}-ocr.txt`;
    downloadService.downloadBlob(blob, name);
    toast.success('Downloaded text file');
  };

  const handleDownloadMd = (selectedAsset: ImageAsset | null) => {
    if (!editableText) return;
    const base = selectedAsset?.filename ? selectedAsset.filename.replace(/\.[^/.]+$/, '') : 'document';
    const mdContent = `# Extracted Document Text\n\n${editableText}\n\n---\n*Extracted with Imago Studio Client-Side OCR (${ocrResult?.confidence || 95}% confidence)*\n`;
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const name = `${base}-ocr.md`;
    downloadService.downloadBlob(blob, name);
    toast.success('Downloaded Markdown file');
  };

  const handleSaveCleanDocument = async (selectedAsset: ImageAsset | null) => {
    if (!previewCanvas) return;
    try {
      const blob = await new Promise<Blob>((resolve) =>
        previewCanvas.toBlob((b) => resolve(b || new Blob()), 'image/png')
      );
      const base = selectedAsset?.filename ? selectedAsset.filename.replace(/\.[^/.]+$/, '') : 'document';
      const name = `${base}-cleaned.png`;
      await assetService.saveProcessedImage(
        selectedAsset ? selectedAsset.id : null,
        blob,
        'other',
        { filterType },
        selectedAsset ? selectedAsset.projectId : null,
        name,
        `Cleaned scan (${filterType})`,
        'ocr'
      );
      toast.success('Saved cleaned scan to Library');
    } catch {
      toast.error('Failed to save to library');
    }
  };

  return (
    <ToolLayout
      title="Client-Side OCR & Document Scanner"
      description="Extract text from documents, screenshots, and receipts locally in browser without sending data to servers."
      icon={Scan}
      onClear={() => {
        setLoadedImg(null);
        setPreviewCanvas(null);
        setOcrResult(null);
        setEditableText('');
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
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Scanned Document View</span>
                {isProcessingFilter ? (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Processing
                  </span>
                ) : ocrResult ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                    {ocrResult.confidence}% confidence
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {previewCanvas && (
                  <button
                    type="button"
                    onClick={() => handleSaveCleanDocument(selectedAsset)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs cursor-pointer"
                  >
                    <span>Save Cleaned Scan</span>
                  </button>
                )}
                {editableText.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTxt(selectedAsset)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>.TXT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadMd(selectedAsset)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium shadow-sm transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>.MD</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Document Image Viewport Container */}
            <div className="flex-1 flex items-center justify-center min-h-[320px] sm:min-h-[460px] lg:min-h-[580px] p-2 sm:p-4 rounded-xl bg-zinc-950/5 dark:bg-black/30 border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
              {previewCanvas ? (
                <div className="relative max-h-full max-w-full flex items-center justify-center">
                  <img
                    src={previewCanvas.toDataURL()}
                    alt="Document preview"
                    className="max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
                  />
                  {/* Bounding box highlight overlays */}
                  {showBoxes && ocrResult && ocrResult.words.length > 0 && previewCanvas && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox={`0 0 ${previewCanvas.width} ${previewCanvas.height}`}
                    >
                      {ocrResult.words.map((w, idx) => (
                        <rect
                          key={idx}
                          x={w.bbox.x0}
                          y={w.bbox.y0}
                          width={w.bbox.x1 - w.bbox.x0}
                          height={w.bbox.y1 - w.bbox.y0}
                          fill="rgba(34, 197, 94, 0.18)"
                          stroke="rgba(34, 197, 94, 0.7)"
                          strokeWidth="1.5"
                        />
                      ))}
                    </svg>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-2 py-16 text-zinc-400 dark:text-zinc-500">
                  <Scan className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
                  <p className="text-xs">Select or upload a document photo to extract text</p>
                </div>
              )}
            </div>
          </div>
        );
      }}
    >
      {() => (
        <div className="space-y-4">
          {/* Document Scanner Filter Card */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3.5 shadow-xs">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Scan className="w-3.5 h-3.5 text-zinc-500" />
              Document Clean-up Filter
            </span>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'binarize', label: 'Binarize Clean-up', desc: 'Whitens bg, darkens ink' },
                { id: 'high-contrast', label: 'High Contrast', desc: 'Enhanced levels' },
                { id: 'sharpen', label: 'Unsharp Mask', desc: 'Clarifies blurry edges' },
                { id: 'none', label: 'Original Photo', desc: 'No enhancement' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id as DocumentFilterType)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    filterType === f.id
                      ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <p className="font-medium truncate">{f.label}</p>
                  <p className="text-[10px] opacity-70 mt-0.5 truncate">{f.desc}</p>
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showBoxes}
                onChange={(e) => setShowBoxes(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100"
              />
              <span>Overlay Detected Word Boxes</span>
            </label>

            {/* Run Extraction Button */}
            <button
              type="button"
              onClick={handleRunOcr}
              disabled={!previewCanvas || isExtracting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="truncate">{statusMessage || 'Extracting Text...'} ({progress}%)</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Extract Text (Client-Side WASM)</span>
                </>
              )}
            </button>
          </div>

          {/* Extracted Text Result Card */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-[#22222a] space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Extracted Text Output
              </span>
              {ocrResult && (
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                  {ocrResult.wordCount} words / {ocrResult.lineCount} lines
                </span>
              )}
            </div>

            <textarea
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
              placeholder="Extracted text will appear here. You can edit, copy, or export it..."
              rows={12}
              className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0c0c0e] text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono leading-relaxed resize-y"
            />

            <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-0.5">
              <span>{editableText.length} characters</span>
              <span>100% Client-Side</span>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};
