import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Crop, ZoomIn, ZoomOut } from 'lucide-react';
import { CanvasLayer } from './types';

interface LayerCropModalProps {
  open: boolean;
  layer: CanvasLayer | null;
  onApply: (croppedImg: HTMLImageElement, croppedUrl: string, newWidth: number, newHeight: number) => void;
  onClose: () => void;
}

type DragHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'move';

export const LayerCropModal: React.FC<LayerCropModalProps> = ({
  open,
  layer,
  onApply,
  onClose,
}) => {
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0.1,
    y: 0.1,
    w: 0.8,
    h: 0.8,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<DragHandle | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialCrop, setInitialCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState<number>(100);

  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
      setZoom(100);
    }
  }, [open, layer]);

  const handleMouseDownHandle = (e: React.MouseEvent, handle: DragHandle) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialCrop({ ...crop });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !activeHandle || !dragStart || !initialCrop || !imageRef.current) return;

      const imgRect = imageRef.current.getBoundingClientRect();
      if (imgRect.width <= 0 || imgRect.height <= 0) return;

      const dx = (e.clientX - dragStart.x) / imgRect.width;
      const dy = (e.clientY - dragStart.y) / imgRect.height;

      let { x, y, w, h } = initialCrop;
      const minSize = 0.05;

      if (activeHandle === 'move') {
        x = Math.max(0, Math.min(1 - w, initialCrop.x + dx));
        y = Math.max(0, Math.min(1 - h, initialCrop.y + dy));
      } else {
        if (activeHandle.includes('e')) {
          w = Math.max(minSize, Math.min(1 - initialCrop.x, initialCrop.w + dx));
        }
        if (activeHandle.includes('w')) {
          const maxLeftMove = initialCrop.w - minSize;
          const deltaLeft = Math.max(-initialCrop.x, Math.min(maxLeftMove, dx));
          x = initialCrop.x + deltaLeft;
          w = initialCrop.w - deltaLeft;
        }
        if (activeHandle.includes('s')) {
          h = Math.max(minSize, Math.min(1 - initialCrop.y, initialCrop.h + dy));
        }
        if (activeHandle.includes('n')) {
          const maxTopMove = initialCrop.h - minSize;
          const deltaTop = Math.max(-initialCrop.y, Math.min(maxTopMove, dy));
          y = initialCrop.y + deltaTop;
          h = initialCrop.h - deltaTop;
        }
      }

      setCrop({
        x: Math.max(0, Math.min(1 - minSize, x)),
        y: Math.max(0, Math.min(1 - minSize, y)),
        w: Math.max(minSize, Math.min(1 - x, w)),
        h: Math.max(minSize, Math.min(1 - y, h)),
      });
    },
    [isDragging, activeHandle, dragStart, initialCrop]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveHandle(null);
    setDragStart(null);
    setInitialCrop(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!open || !layer || layer.type !== 'image' || !layer.imgElement) {
    return null;
  }

  const handleApplyCrop = () => {
    const srcImg = layer.imgElement;
    if (!srcImg) return;

    const natW = srcImg.naturalWidth;
    const natH = srcImg.naturalHeight;

    const pixelX = Math.round(crop.x * natW);
    const pixelY = Math.round(crop.y * natH);
    const pixelW = Math.round(crop.w * natW);
    const pixelH = Math.round(crop.h * natH);

    const canvas = document.createElement('canvas');
    canvas.width = pixelW;
    canvas.height = pixelH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(srcImg, pixelX, pixelY, pixelW, pixelH, 0, 0, pixelW, pixelH);

    const croppedUrl = canvas.toDataURL('image/png');
    const newImg = new Image();
    newImg.onload = () => {
      // Scale down canvas layer width/height proportionally
      const scale = crop.w;
      const newLayerW = Math.round(layer.width * scale);
      const newLayerH = Math.round((newLayerW / pixelW) * pixelH);
      onApply(newImg, croppedUrl, newLayerW, newLayerH);
      onClose();
    };
    newImg.src = croppedUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#141418] border border-[#262632] rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crop className="w-4 h-4 text-lime-400" />
            <h3 className="text-sm font-bold text-zinc-100">Crop Image Layer</h3>
            <span className="text-xs text-zinc-500 font-mono">({layer.name})</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-zinc-400">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(50, z - 25))}
                className="p-1 hover:text-zinc-200"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1.5">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(200, z + 25))}
                className="p-1 hover:text-zinc-200"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Cropper Area */}
        <div className="flex-1 p-6 flex items-center justify-center overflow-auto bg-[#0a0a0d] relative min-h-[420px]">
          <div
            className="relative inline-block transition-transform duration-75 select-none"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <img
              ref={imageRef}
              src={layer.imgSrc}
              alt="Crop target"
              className="max-h-[500px] max-w-full object-contain block rounded shadow-2xl pointer-events-none"
            />

            {/* Crop Boundary Box */}
            <div
              className="absolute border-2 border-lime-400 z-10"
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
              }}
            >
              {/* Center Move Area */}
              <div
                onMouseDown={(e) => handleMouseDownHandle(e, 'move')}
                className="absolute inset-2 cursor-move z-10"
              />

              {/* Grid Lines */}
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-lime-300" />
                <div className="border-r border-b border-lime-300" />
                <div className="border-b border-lime-300" />
                <div className="border-r border-b border-lime-300" />
                <div className="border-r border-b border-lime-300" />
                <div className="border-b border-lime-300" />
                <div className="border-r border-b border-lime-300" />
                <div className="border-r border-b border-lime-300" />
                <div />
              </div>

              {/* Edge Handles */}
              <div
                onMouseDown={(e) => handleMouseDownHandle(e, 'n')}
                className="absolute -top-3 left-3 right-3 h-6 cursor-ns-resize z-20 flex items-center justify-center group"
              >
                <div className="w-10 h-1.5 bg-lime-400 rounded-full border border-black shadow" />
              </div>
              <div
                onMouseDown={(e) => handleMouseDownHandle(e, 's')}
                className="absolute -bottom-3 left-3 right-3 h-6 cursor-ns-resize z-20 flex items-center justify-center group"
              >
                <div className="w-10 h-1.5 bg-lime-400 rounded-full border border-black shadow" />
              </div>
              <div
                onMouseDown={(e) => handleMouseDownHandle(e, 'w')}
                className="absolute -left-3 top-3 bottom-3 w-6 cursor-ew-resize z-20 flex items-center justify-center group"
              >
                <div className="w-1.5 h-10 bg-lime-400 rounded-full border border-black shadow" />
              </div>
              <div
                onMouseDown={(e) => handleMouseDownHandle(e, 'e')}
                className="absolute -right-3 top-3 bottom-3 w-6 cursor-ew-resize z-20 flex items-center justify-center group"
              >
                <div className="w-1.5 h-10 bg-lime-400 rounded-full border border-black shadow" />
              </div>

              {/* 4 Corner Handles */}
              <div
                onMouseDown={(e) => handleMouseDownHandle(e, 'nw')}
                className="absolute -top-3 -left-3 w-6 h-6 flex items-center justify-center cursor-nwse-resize z-30"
              >
                <div className="w-3.5 h-3.5 bg-lime-400 border-2 border-black rounded-sm shadow-md" />
              </div>
              <div
                onMouseDown={(e) => handleMouseDownHandle(e, 'ne')}
                className="absolute -top-3 -right-3 w-6 h-6 flex items-center justify-center cursor-nesw-resize z-30"
              >
                <div className="w-3.5 h-3.5 bg-lime-400 border-2 border-black rounded-sm shadow-md" />
              </div>
              <div
                onMouseDown={(e) => handleMouseDownHandle(e, 'se')}
                className="absolute -bottom-3 -right-3 w-6 h-6 flex items-center justify-center cursor-nwse-resize z-30"
              >
                <div className="w-3.5 h-3.5 bg-lime-400 border-2 border-black rounded-sm shadow-md" />
              </div>
              <div
                onMouseDown={(e) => handleMouseDownHandle(e, 'sw')}
                className="absolute -bottom-3 -left-3 w-6 h-6 flex items-center justify-center cursor-nesw-resize z-30"
              >
                <div className="w-3.5 h-3.5 bg-lime-400 border-2 border-black rounded-sm shadow-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between bg-[#121217]">
          <span className="text-xs text-zinc-400">
            Drag handles to slice layer image. Center area repositions the crop.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCrop}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-lime-400 hover:bg-lime-300 text-black text-xs font-bold rounded-lg transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Apply Layer Crop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
