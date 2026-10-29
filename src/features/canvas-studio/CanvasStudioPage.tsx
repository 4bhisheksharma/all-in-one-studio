import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Download,
  FolderOpen,
  Type,
  Trash2,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  UploadCloud,
  Lock,
  Unlock,
  ChevronUp,
  Link,
  Unlink,
  Crop,
  RotateCw,
} from 'lucide-react';
import { AssetPickerDialog } from '@/components/image-picker/AssetPickerDialog';
import { ProcessingResultPanel } from '@/components/common/ProcessingResultPanel';
import { assetService } from '@/services/storage/assetService';
import { ImageAsset } from '@/types';
import { CanvasLayer, CanvasPreset } from './types';
import { LayerCropModal } from './LayerCropModal';
import { toast } from 'sonner';

const PRESETS: CanvasPreset[] = [
  { id: 'youtube', name: 'YouTube Landscape (1920 × 1080)', width: 1920, height: 1080, category: 'display' },
  { id: 'square', name: 'Square Post (1080 × 1080)', width: 1080, height: 1080, category: 'social' },
  { id: 'story', name: 'Story / Reel (1080 × 1920)', width: 1080, height: 1920, category: 'social' },
  { id: 'opengraph', name: 'Twitter / Facebook OG (1200 × 630)', width: 1200, height: 630, category: 'social' },
  { id: 'banner', name: 'Landscape Banner (2560 × 1440)', width: 2560, height: 1440, category: 'display' },
  { id: 'avatar', name: 'Avatar / Profile (500 × 500)', width: 500, height: 500, category: 'social' },
];

type TransformMode = 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'rot';

export const CanvasStudioPage: React.FC = () => {
  // Canvas configuration
  const [canvasWidth, setCanvasWidth] = useState<number>(1920);
  const [canvasHeight, setCanvasHeight] = useState<number>(1080);
  const [canvasBgColor, setCanvasBgColor] = useState<string>('#141418');
  const [zoom, setZoom] = useState<number>(0.4);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('youtube');

  // Layers state
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Inspector active tab
  const [inspectorTab, setInspectorTab] = useState<'adjust' | 'transform' | 'style'>('adjust');

  // Modals & Export Result
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    blob: Blob;
    width: number;
    height: number;
  } | null>(null);

  // References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transform / Drag state
  const [transformMode, setTransformMode] = useState<TransformMode | null>(null);
  const [transformStart, setTransformStart] = useState<{ x: number; y: number } | null>(null);
  const [initialLayerState, setInitialLayerState] = useState<CanvasLayer | null>(null);

  const selectedLayer = useMemo(() => {
    return layers.find((l) => l.id === selectedLayerId) || null;
  }, [layers, selectedLayerId]);

  // Update selected layer property
  const updateSelectedLayer = useCallback(
    (patch: Partial<CanvasLayer>) => {
      if (!selectedLayerId) return;
      setLayers((prev) =>
        prev.map((l) => (l.id === selectedLayerId ? { ...l, ...patch } : l))
      );
    },
    [selectedLayerId]
  );

  // Delete layer
  const deleteLayer = useCallback(
    (targetId?: string) => {
      const idToDelete = targetId || selectedLayerId;
      if (!idToDelete) return;
      setLayers((prev) => prev.filter((l) => l.id !== idToDelete));
      if (selectedLayerId === idToDelete) {
        setSelectedLayerId(null);
      }
      toast.info('Layer deleted');
    },
    [selectedLayerId]
  );

  // Keyboard Shortcuts: Delete, Backspace, Nudge with arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedLayerId) {
          e.preventDefault();
          deleteLayer(selectedLayerId);
        }
      } else if (e.key === 'Escape') {
        setSelectedLayerId(null);
      } else if (selectedLayer && !selectedLayer.locked) {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          updateSelectedLayer({ x: selectedLayer.x - step });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          updateSelectedLayer({ x: selectedLayer.x + step });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          updateSelectedLayer({ y: selectedLayer.y - step });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          updateSelectedLayer({ y: selectedLayer.y + step });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerId, selectedLayer, deleteLayer, updateSelectedLayer]);

  // Render Canvas Composite
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    if (canvasBgColor === 'transparent') {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Sort layers by zIndex ascending
    const sortedLayers = [...layers].filter((l) => l.visible).sort((a, b) => a.zIndex - b.zIndex);

    sortedLayers.forEach((layer) => {
      ctx.save();

      // Transform origin to center of layer for rotation
      const cx = layer.x + layer.width / 2;
      const cy = layer.y + layer.height / 2;
      ctx.translate(cx, cy);

      if (layer.rotation !== 0) {
        ctx.rotate((layer.rotation * Math.PI) / 180);
      }

      // Flip
      const scaleX = layer.flipX ? -1 : 1;
      const scaleY = layer.flipY ? -1 : 1;
      ctx.scale(scaleX, scaleY);

      // Opacity
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity / 100));

      const lx = -layer.width / 2;
      const ly = -layer.height / 2;

      // Drop shadow
      if (layer.shadowBlur > 0) {
        ctx.shadowColor = layer.shadowColor;
        ctx.shadowBlur = layer.shadowBlur;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
      }

      // Rounded corner clipping
      if (layer.borderRadius > 0) {
        ctx.beginPath();
        const r = Math.min(layer.borderRadius, layer.width / 2, layer.height / 2);
        ctx.roundRect(lx, ly, layer.width, layer.height, r);
        ctx.clip();
      }

      // Draw Layer Content
      if (layer.type === 'image' && layer.imgElement) {
        const filters: string[] = [];
        if (layer.brightness !== 100) filters.push(`brightness(${layer.brightness}%)`);
        if (layer.contrast !== 100) filters.push(`contrast(${layer.contrast}%)`);
        if (layer.saturation !== 100) filters.push(`saturate(${layer.saturation}%)`);
        if (layer.blur > 0) filters.push(`blur(${layer.blur}px)`);
        if (layer.grayscale > 0) filters.push(`grayscale(${layer.grayscale}%)`);
        if (layer.sepia > 0) filters.push(`sepia(${layer.sepia}%)`);
        if (layer.invert > 0) filters.push(`invert(${layer.invert}%)`);
        if (layer.hueRotate && layer.hueRotate > 0) filters.push(`hue-rotate(${layer.hueRotate}deg)`);

        if (filters.length > 0) {
          ctx.filter = filters.join(' ');
        }

        ctx.drawImage(layer.imgElement, lx, ly, layer.width, layer.height);
        ctx.filter = 'none';
      } else if (layer.type === 'text' && layer.text) {
        ctx.fillStyle = layer.fontColor || '#ffffff';
        ctx.font = `${layer.fontWeight || 'bold'} ${layer.fontSize || 48}px ${layer.fontFamily || 'sans-serif'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.text, 0, 0);
      }

      // Border
      if (layer.borderWidth > 0) {
        ctx.strokeStyle = layer.borderColor;
        ctx.lineWidth = layer.borderWidth;
        if (layer.borderRadius > 0) {
          const r = Math.min(layer.borderRadius, layer.width / 2, layer.height / 2);
          ctx.beginPath();
          ctx.roundRect(lx, ly, layer.width, layer.height, r);
          ctx.stroke();
        } else {
          ctx.strokeRect(lx, ly, layer.width, layer.height);
        }
      }

      ctx.restore();
    });
  }, [canvasWidth, canvasHeight, canvasBgColor, layers]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Adjust zoom to fit viewport container
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth - 80;
    const ch = containerRef.current.clientHeight - 80;
    const scale = Math.min(cw / canvasWidth, ch / canvasHeight, 1);
    setZoom(Math.max(0.15, Number(scale.toFixed(2))));
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    handleFitToScreen();
  }, [handleFitToScreen]);

  // Add multiple assets from Library to the canvas
  const handleAddAssetsFromLibrary = async (assets: ImageAsset[]) => {
    for (const asset of assets) {
      const blob = await assetService.getAssetBlob(asset.id);
      if (!blob) continue;

      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const maxW = canvasWidth * 0.6;
      const maxH = canvasHeight * 0.6;
      if (w > maxW || h > maxH) {
        const scale = Math.min(maxW / w, maxH / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const offset = (layers.length % 5) * 40;
      const x = Math.round((canvasWidth - w) / 2 + offset);
      const y = Math.round((canvasHeight - h) / 2 + offset);

      const newLayer: CanvasLayer = {
        id: crypto.randomUUID(),
        type: 'image',
        name: asset.filename,
        assetId: asset.id,
        imgSrc: url,
        imgElement: img,
        x,
        y,
        width: w,
        height: h,
        rotation: 0,
        opacity: 100,
        flipX: false,
        flipY: false,
        zIndex: layers.length + 1,
        locked: false,
        visible: true,
        aspectRatioLocked: true,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        invert: 0,
        hueRotate: 0,
        borderRadius: 0,
        borderWidth: 0,
        borderColor: '#ffffff',
        shadowBlur: 0,
        shadowColor: 'rgba(0,0,0,0.5)',
      };

      setLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);
    }

    toast.success(`Added ${assets.length} image(s) to canvas`);
  };

  // Add Text Layer
  const handleAddTextLayer = () => {
    const newLayer: CanvasLayer = {
      id: crypto.randomUUID(),
      type: 'text',
      name: 'Text Layer',
      text: 'Creative Canvas Studio',
      fontSize: Math.round(canvasWidth * 0.05),
      fontColor: '#ffffff',
      fontWeight: 'bold',
      fontFamily: 'sans-serif',
      x: Math.round(canvasWidth * 0.25),
      y: Math.round(canvasHeight * 0.4),
      width: Math.round(canvasWidth * 0.5),
      height: Math.round(canvasHeight * 0.2),
      rotation: 0,
      opacity: 100,
      flipX: false,
      flipY: false,
      zIndex: layers.length + 1,
      locked: false,
      visible: true,
      aspectRatioLocked: false,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      grayscale: 0,
      sepia: 0,
      invert: 0,
      hueRotate: 0,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: '#ffffff',
      shadowBlur: 8,
      shadowColor: 'rgba(0,0,0,0.7)',
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    toast.success('Text layer added');
  };

  // Canvas Click: Hit-test to select layer directly if clicked on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvasWidth;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvasHeight;

    const sorted = [...layers]
      .filter((l) => l.visible && !l.locked)
      .sort((a, b) => b.zIndex - a.zIndex);

    let hitLayer: CanvasLayer | null = null;
    for (const layer of sorted) {
      if (
        clickX >= layer.x &&
        clickX <= layer.x + layer.width &&
        clickY >= layer.y &&
        clickY <= layer.y + layer.height
      ) {
        hitLayer = layer;
        break;
      }
    }

    if (hitLayer) {
      setSelectedLayerId(hitLayer.id);
    } else {
      setSelectedLayerId(null);
    }
  };

  // Start Interactive Transform (Move, Resize Corners, Resize Edges, Rotate)
  const handleStartTransform = (e: React.MouseEvent, mode: TransformMode) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedLayer || selectedLayer.locked) return;

    setTransformMode(mode);
    setTransformStart({ x: e.clientX, y: e.clientY });
    setInitialLayerState({ ...selectedLayer });
  };

  // Handle Window Mouse Move for Transforming Selected Layer
  const handleTransformMove = useCallback(
    (e: MouseEvent) => {
      if (!transformMode || !transformStart || !initialLayerState) return;

      const dx = (e.clientX - transformStart.x) / zoom;
      const dy = (e.clientY - transformStart.y) / zoom;

      const init = initialLayerState;

      if (transformMode === 'move') {
        updateSelectedLayer({
          x: Math.round(init.x + dx),
          y: Math.round(init.y + dy),
        });
        return;
      }

      if (transformMode === 'rot') {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.left + (init.x + init.width / 2) * zoom;
        const centerY = rect.top + (init.y + init.height / 2) * zoom;

        const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let deg = Math.round((rad * 180) / Math.PI) + 90;
        if (deg > 180) deg -= 360;
        if (deg < -180) deg += 360;

        updateSelectedLayer({ rotation: deg });
        return;
      }

      // Handle corner and edge resizing
      let newW = init.width;
      let newH = init.height;
      let newX = init.x;
      let newY = init.y;

      const minDim = 20;

      if (transformMode.includes('e')) {
        newW = Math.max(minDim, Math.round(init.width + dx));
      }
      if (transformMode.includes('s')) {
        newH = Math.max(minDim, Math.round(init.height + dy));
      }
      if (transformMode.includes('w')) {
        const deltaW = Math.min(init.width - minDim, Math.round(dx));
        newX = init.x + deltaW;
        newW = init.width - deltaW;
      }
      if (transformMode.includes('n')) {
        const deltaH = Math.min(init.height - minDim, Math.round(dy));
        newY = init.y + deltaH;
        newH = init.height - deltaH;
      }

      // Enforce aspect ratio lock if active
      if (init.aspectRatioLocked || e.shiftKey) {
        const ratio = init.width / init.height;
        if (transformMode === 'nw' || transformMode === 'se') {
          newH = Math.round(newW / ratio);
        } else if (transformMode === 'ne' || transformMode === 'sw') {
          newH = Math.round(newW / ratio);
        } else if (transformMode === 'n' || transformMode === 's') {
          newW = Math.round(newH * ratio);
        } else if (transformMode === 'e' || transformMode === 'w') {
          newH = Math.round(newW / ratio);
        }
      }

      updateSelectedLayer({
        x: newX,
        y: newY,
        width: Math.max(minDim, newW),
        height: Math.max(minDim, newH),
      });
    },
    [transformMode, transformStart, initialLayerState, zoom, updateSelectedLayer]
  );

  const handleTransformUp = useCallback(() => {
    setTransformMode(null);
    setTransformStart(null);
    setInitialLayerState(null);
  }, []);

  useEffect(() => {
    if (transformMode) {
      window.addEventListener('mousemove', handleTransformMove);
      window.addEventListener('mouseup', handleTransformUp);
      return () => {
        window.removeEventListener('mousemove', handleTransformMove);
        window.removeEventListener('mouseup', handleTransformUp);
      };
    }
  }, [transformMode, handleTransformMove, handleTransformUp]);

  // Reorder / Slide Layers
  const moveLayerUp = (layerId: string) => {
    const idx = layers.findIndex((l) => l.id === layerId);
    if (idx === -1 || idx === layers.length - 1) return;

    setLayers((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy.map((l, i) => ({ ...l, zIndex: i + 1 }));
    });
  };

  const moveLayerDown = (layerId: string) => {
    const idx = layers.findIndex((l) => l.id === layerId);
    if (idx <= 0) return;

    setLayers((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy.map((l, i) => ({ ...l, zIndex: i + 1 }));
    });
  };

  const bringToFront = () => {
    if (!selectedLayerId) return;
    setLayers((prev) => {
      const target = prev.find((l) => l.id === selectedLayerId);
      if (!target) return prev;
      const rest = prev.filter((l) => l.id !== selectedLayerId);
      return [...rest, target].map((l, i) => ({ ...l, zIndex: i + 1 }));
    });
  };

  const sendToBack = () => {
    if (!selectedLayerId) return;
    setLayers((prev) => {
      const target = prev.find((l) => l.id === selectedLayerId);
      if (!target) return prev;
      const rest = prev.filter((l) => l.id !== selectedLayerId);
      return [target, ...rest].map((l, i) => ({ ...l, zIndex: i + 1 }));
    });
  };

  const duplicateLayer = () => {
    if (!selectedLayer) return;
    const cloned: CanvasLayer = {
      ...selectedLayer,
      id: crypto.randomUUID(),
      name: `${selectedLayer.name} (Copy)`,
      x: selectedLayer.x + 30,
      y: selectedLayer.y + 30,
      zIndex: layers.length + 1,
    };
    setLayers((prev) => [...prev, cloned]);
    setSelectedLayerId(cloned.id);
    toast.success('Layer duplicated');
  };

  // Instant Background Removal on Selected Layer
  const handleRemoveBgOnLayer = () => {
    if (!selectedLayer || selectedLayer.type !== 'image' || !selectedLayer.imgElement) return;

    const img = selectedLayer.imgElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const cornerR = (data[0] + data[(w - 1) * 4] + data[(h - 1) * w * 4]) / 3;
    const cornerG = (data[1] + data[(w - 1) * 4 + 1] + data[(h - 1) * w * 4 + 1]) / 3;
    const cornerB = (data[2] + data[(w - 1) * 4 + 2] + data[(h - 1) * w * 4 + 2]) / 3;

    const total = w * h;
    for (let i = 0; i < total; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const dist = Math.sqrt((r - cornerR) ** 2 + (g - cornerG) ** 2 + (b - cornerB) ** 2);
      if (dist < 42) {
        data[idx + 3] = 0;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const newImg = new Image();
    newImg.onload = () => {
      updateSelectedLayer({ imgElement: newImg, imgSrc: off.toDataURL('image/png') });
      toast.success('Background isolated on layer!');
    };
    newImg.src = off.toDataURL('image/png');
  };

  // Apply In-Canvas Layer Crop Result
  const handleApplyLayerCrop = (
    croppedImg: HTMLImageElement,
    croppedUrl: string,
    newW: number,
    newH: number
  ) => {
    if (!selectedLayerId) return;
    updateSelectedLayer({
      imgElement: croppedImg,
      imgSrc: croppedUrl,
      width: newW,
      height: newH,
    });
    toast.success('Layer cropped');
  };

  // Full High-DPI Composition Export
  const handleExportComposition = async () => {
    setExporting(true);
    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvasWidth;
      exportCanvas.height = canvasHeight;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D unavailable');

      if (canvasBgColor !== 'transparent') {
        ctx.fillStyle = canvasBgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      const sortedLayers = [...layers].filter((l) => l.visible).sort((a, b) => a.zIndex - b.zIndex);

      for (const layer of sortedLayers) {
        ctx.save();
        const cx = layer.x + layer.width / 2;
        const cy = layer.y + layer.height / 2;
        ctx.translate(cx, cy);

        if (layer.rotation !== 0) ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
        ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity / 100));

        const lx = -layer.width / 2;
        const ly = -layer.height / 2;

        if (layer.shadowBlur > 0) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = layer.shadowBlur;
          ctx.shadowOffsetX = 4;
          ctx.shadowOffsetY = 4;
        }

        if (layer.borderRadius > 0) {
          const r = Math.min(layer.borderRadius, layer.width / 2, layer.height / 2);
          ctx.beginPath();
          ctx.roundRect(lx, ly, layer.width, layer.height, r);
          ctx.clip();
        }

        if (layer.type === 'image' && layer.imgElement) {
          const filters: string[] = [];
          if (layer.brightness !== 100) filters.push(`brightness(${layer.brightness}%)`);
          if (layer.contrast !== 100) filters.push(`contrast(${layer.contrast}%)`);
          if (layer.saturation !== 100) filters.push(`saturate(${layer.saturation}%)`);
          if (layer.blur > 0) filters.push(`blur(${layer.blur}px)`);
          if (layer.grayscale > 0) filters.push(`grayscale(${layer.grayscale}%)`);
          if (layer.sepia > 0) filters.push(`sepia(${layer.sepia}%)`);
          if (layer.invert > 0) filters.push(`invert(${layer.invert}%)`);
          if (layer.hueRotate && layer.hueRotate > 0) filters.push(`hue-rotate(${layer.hueRotate}deg)`);

          if (filters.length > 0) ctx.filter = filters.join(' ');
          ctx.drawImage(layer.imgElement, lx, ly, layer.width, layer.height);
          ctx.filter = 'none';
        } else if (layer.type === 'text' && layer.text) {
          ctx.fillStyle = layer.fontColor || '#ffffff';
          ctx.font = `${layer.fontWeight || 'bold'} ${layer.fontSize || 48}px ${layer.fontFamily || 'sans-serif'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(layer.text, 0, 0);
        }

        if (layer.borderWidth > 0) {
          ctx.strokeStyle = layer.borderColor;
          ctx.lineWidth = layer.borderWidth;
          if (layer.borderRadius > 0) {
            const r = Math.min(layer.borderRadius, layer.width / 2, layer.height / 2);
            ctx.beginPath();
            ctx.roundRect(lx, ly, layer.width, layer.height, r);
            ctx.stroke();
          } else {
            ctx.strokeRect(lx, ly, layer.width, layer.height);
          }
        }

        ctx.restore();
      }

      exportCanvas.toBlob(
        (blob) => {
          if (blob) {
            setExportResult({
              blob,
              width: canvasWidth,
              height: canvasHeight,
            });
            toast.success('Composition exported successfully!');
          }
          setExporting(false);
        },
        'image/png',
        0.95
      );
    } catch {
      toast.error('Failed to export composition');
      setExporting(false);
    }
  };

  // Change Canvas Preset
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setCanvasWidth(preset.width);
      setCanvasHeight(preset.height);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-4 md:-m-6 lg:-m-8 select-none bg-[#0a0a0d]">
      {/* Top Application Bar */}
      <header className="h-14 px-4 bg-[#121217] border-b border-[#22222a] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-lime-400" />
              Studio Canvas
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-lime-400/20 text-lime-400 font-semibold">
              PRO
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          {/* Preset Selector */}
          <div className="relative">
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="appearance-none bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 pl-3 pr-8 py-1.5 rounded-lg focus:outline-none focus:border-lime-400 cursor-pointer"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Custom Editable Canvas Dimensions */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/80 px-2 py-1 rounded-lg border border-zinc-800">
            <input
              type="number"
              value={canvasWidth}
              onChange={(e) => setCanvasWidth(Math.max(100, Number(e.target.value)))}
              className="w-14 bg-transparent text-center font-mono text-zinc-200 focus:outline-none focus:text-lime-400"
              title="Canvas Width"
            />
            <span>×</span>
            <input
              type="number"
              value={canvasHeight}
              onChange={(e) => setCanvasHeight(Math.max(100, Number(e.target.value)))}
              className="w-14 bg-transparent text-center font-mono text-zinc-200 focus:outline-none focus:text-lime-400"
              title="Canvas Height"
            />
            <span className="text-zinc-600 font-mono">px</span>
          </div>
        </div>

        {/* Center / Action Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-zinc-700"
          >
            <FolderOpen className="w-3.5 h-3.5 text-lime-400" />
            <span>Add Images</span>
          </button>

          <button
            onClick={handleAddTextLayer}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-zinc-700"
          >
            <Type className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Add Text</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={async (e) => {
              if (e.target.files) {
                const files = Array.from(e.target.files);
                for (const file of files) {
                  const url = URL.createObjectURL(file);
                  const img = new Image();
                  img.src = url;
                  await new Promise<void>((r) => {
                    img.onload = () => r();
                  });

                  const newLayer: CanvasLayer = {
                    id: crypto.randomUUID(),
                    type: 'image',
                    name: file.name,
                    imgSrc: url,
                    imgElement: img,
                    x: Math.round(canvasWidth * 0.2),
                    y: Math.round(canvasHeight * 0.2),
                    width: Math.min(img.naturalWidth, 800),
                    height: Math.min(img.naturalHeight, 800),
                    rotation: 0,
                    opacity: 100,
                    flipX: false,
                    flipY: false,
                    zIndex: layers.length + 1,
                    locked: false,
                    visible: true,
                    aspectRatioLocked: true,
                    brightness: 100,
                    contrast: 100,
                    saturation: 100,
                    blur: 0,
                    grayscale: 0,
                    sepia: 0,
                    invert: 0,
                    hueRotate: 0,
                    borderRadius: 0,
                    borderWidth: 0,
                    borderColor: '#ffffff',
                    shadowBlur: 0,
                    shadowColor: 'rgba(0,0,0,0.5)',
                  };
                  setLayers((prev) => [...prev, newLayer]);
                  setSelectedLayerId(newLayer.id);
                }
              }
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors cursor-pointer"
            title="Upload from Device"
          >
            <UploadCloud className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Zoom & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-zinc-400">
            <button
              onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
              className="p-1 hover:text-zinc-200"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 min-w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
              className="p-1 hover:text-zinc-200"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitToScreen}
              className="p-1 hover:text-zinc-200 border-l border-zinc-800 ml-1"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleExportComposition}
            disabled={exporting || layers.length === 0}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-black font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 fill-black" />
            <span>{exporting ? 'Exporting...' : 'Export'}</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body: 3-column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Layers Panel */}
        <aside className="w-64 border-r border-[#22222a] bg-[#111115] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#22222a] flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-lime-400" />
              Layers ({layers.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {layers.length === 0 ? (
              <div className="text-center p-6 text-zinc-600 text-xs space-y-2">
                <p>No layers yet</p>
                <p className="text-[11px] text-zinc-500">
                  Click &quot;Add Images&quot; above to place photos onto the canvas.
                </p>
              </div>
            ) : (
              [...layers]
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((layer) => (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                      layer.id === selectedLayerId
                        ? 'bg-lime-400/10 border-lime-400/40 text-lime-300 font-medium'
                        : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      {layer.type === 'image' ? (
                        <div className="w-7 h-7 rounded bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700">
                          {layer.imgSrc && (
                            <img src={layer.imgSrc} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      ) : (
                        <Type className="w-5 h-5 text-sky-400 shrink-0" />
                      )}
                      <span className="truncate text-xs">{layer.name}</span>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Slide Layer Up */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveLayerUp(layer.id);
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                        title="Move layer up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Slide Layer Down */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveLayerDown(layer.id);
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                        title="Move layer down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayers((prev) =>
                            prev.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l))
                          );
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                        title={layer.visible ? 'Hide layer' : 'Show layer'}
                      >
                        {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
                      </button>

                      {/* Lock Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayers((prev) =>
                            prev.map((l) => (l.id === layer.id ? { ...l, locked: !l.locked } : l))
                          );
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                        title={layer.locked ? 'Unlock' : 'Lock'}
                      >
                        {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete Layer Icon */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(layer.id);
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                        title="Delete layer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Layer Actions */}
          {selectedLayer && (
            <div className="p-2 border-t border-[#22222a] grid grid-cols-4 gap-1 bg-[#0c0c0e]">
              <button
                onClick={bringToFront}
                className="p-1.5 rounded bg-zinc-850 hover:bg-zinc-800 text-[10px] text-zinc-300 text-center font-medium transition-colors"
                title="Bring to Front"
              >
                Top
              </button>
              <button
                onClick={sendToBack}
                className="p-1.5 rounded bg-zinc-850 hover:bg-zinc-800 text-[10px] text-zinc-300 text-center font-medium transition-colors"
                title="Send to Back"
              >
                Bottom
              </button>
              <button
                onClick={duplicateLayer}
                className="p-1.5 rounded bg-zinc-850 hover:bg-zinc-800 text-[10px] text-zinc-300 text-center font-medium transition-colors"
                title="Duplicate"
              >
                Copy
              </button>
              <button
                onClick={() => deleteLayer()}
                className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] text-center font-medium transition-colors"
                title="Delete layer (Del)"
              >
                Delete
              </button>
            </div>
          )}
        </aside>

        {/* CENTER COLUMN: Spacious Interactive Canvas Viewport */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(#1c1c24_1px,transparent_1px)] bg-[size:16px_16px] bg-[#0c0c10] relative select-none"
        >
          <div
            className="shadow-2xl rounded-sm transition-transform duration-75 relative"
            style={{
              width: `${canvasWidth * zoom}px`,
              height: `${canvasHeight * zoom}px`,
            }}
          >
            {/* The Output Canvas */}
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{
                width: `${canvasWidth * zoom}px`,
                height: `${canvasHeight * zoom}px`,
              }}
              className="block shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-zinc-800/80 rounded-sm cursor-default"
            />

            {/* DOM-Based Interactive Selection & Resize Overlay */}
            {selectedLayer && selectedLayer.visible && !selectedLayer.locked && (
              <div
                className="absolute pointer-events-none z-30"
                style={{
                  left: `${selectedLayer.x * zoom}px`,
                  top: `${selectedLayer.y * zoom}px`,
                  width: `${selectedLayer.width * zoom}px`,
                  height: `${selectedLayer.height * zoom}px`,
                  transform: `rotate(${selectedLayer.rotation}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Dashed Border */}
                <div className="absolute inset-0 border-2 border-dashed border-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.4)]" />

                {/* Center translation / move area */}
                <div
                  onMouseDown={(e) => handleStartTransform(e, 'move')}
                  className="absolute inset-2 pointer-events-auto cursor-grab active:cursor-grabbing"
                  title="Drag to reposition layer"
                />

                {/* Rotation Stalk & Handle */}
                <div
                  onMouseDown={(e) => handleStartTransform(e, 'rot')}
                  className="absolute left-1/2 -top-8 -translate-x-1/2 flex flex-col items-center pointer-events-auto cursor-grab active:cursor-grabbing group z-40"
                  title="Drag to rotate layer"
                >
                  <div className="w-4 h-4 rounded-full bg-lime-400 border-2 border-black shadow group-hover:scale-125 transition-transform" />
                  <div className="w-0.5 h-4 bg-lime-400" />
                </div>

                {/* 4 Corner Resize Handles */}
                <div
                  onMouseDown={(e) => handleStartTransform(e, 'nw')}
                  className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-sm bg-lime-400 border-2 border-black shadow cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform z-40"
                  title="Resize top-left"
                />
                <div
                  onMouseDown={(e) => handleStartTransform(e, 'ne')}
                  className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-sm bg-lime-400 border-2 border-black shadow cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform z-40"
                  title="Resize top-right"
                />
                <div
                  onMouseDown={(e) => handleStartTransform(e, 'se')}
                  className="absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-sm bg-lime-400 border-2 border-black shadow cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform z-40"
                  title="Resize bottom-right"
                />
                <div
                  onMouseDown={(e) => handleStartTransform(e, 'sw')}
                  className="absolute -bottom-2.5 -left-2.5 w-5 h-5 rounded-sm bg-lime-400 border-2 border-black shadow cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform z-40"
                  title="Resize bottom-left"
                />

                {/* 4 Edge Handles */}
                <div
                  onMouseDown={(e) => handleStartTransform(e, 'n')}
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 rounded-full bg-lime-400 border border-black shadow cursor-ns-resize pointer-events-auto hover:scale-110 transition-transform z-40"
                  title="Resize top edge"
                />
                <div
                  onMouseDown={(e) => handleStartTransform(e, 's')}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 rounded-full bg-lime-400 border border-black shadow cursor-ns-resize pointer-events-auto hover:scale-110 transition-transform z-40"
                  title="Resize bottom edge"
                />
                <div
                  onMouseDown={(e) => handleStartTransform(e, 'w')}
                  className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-8 rounded-full bg-lime-400 border border-black shadow cursor-ew-resize pointer-events-auto hover:scale-110 transition-transform z-40"
                  title="Resize left edge"
                />
                <div
                  onMouseDown={(e) => handleStartTransform(e, 'e')}
                  className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-8 rounded-full bg-lime-400 border border-black shadow cursor-ew-resize pointer-events-auto hover:scale-110 transition-transform z-40"
                  title="Resize right edge"
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Layer Tools & Adjustments Inspector */}
        <aside className="w-80 border-l border-[#22222a] bg-[#111115] flex flex-col shrink-0">
          {selectedLayer ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-3 border-b border-[#22222a] flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-100 truncate max-w-[200px]">
                  {selectedLayer.name}
                </span>
                <button
                  onClick={() => deleteLayer()}
                  className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                  title="Remove layer (Del)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Inspector Navigation Tabs */}
              <div className="grid grid-cols-3 p-1.5 bg-zinc-900 border-b border-[#22222a] gap-1">
                <button
                  type="button"
                  onClick={() => setInspectorTab('adjust')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    inspectorTab === 'adjust'
                      ? 'bg-lime-400 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Filters
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('transform')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    inspectorTab === 'transform'
                      ? 'bg-lime-400 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Transform
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('style')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    inspectorTab === 'style'
                      ? 'bg-lime-400 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Style
                </button>
              </div>

              {/* Inspector Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
                {/* TAB 1: FILTERS & IMAGE TUNING */}
                {inspectorTab === 'adjust' && (
                  <div className="space-y-4">
                    {/* Layer Tools: Crop & Background Removal */}
                    {selectedLayer.type === 'image' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setCropModalOpen(true)}
                          className="py-2 px-2.5 rounded-xl bg-lime-400/10 hover:bg-lime-400/20 text-lime-400 border border-lime-400/30 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                        >
                          <Crop className="w-3.5 h-3.5" />
                          <span>Crop Layer</span>
                        </button>

                        <button
                          onClick={handleRemoveBgOnLayer}
                          className="py-2 px-2.5 rounded-xl bg-lime-400/10 hover:bg-lime-400/20 text-lime-400 border border-lime-400/30 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Remove BG</span>
                        </button>
                      </div>
                    )}

                    {/* Defocus Blur Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span className="font-semibold text-zinc-300">Blur Effect</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={selectedLayer.blur}
                        onChange={(e) => updateSelectedLayer({ blur: Number(e.target.value) })}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Brightness */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Brightness</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={selectedLayer.brightness}
                        onChange={(e) => updateSelectedLayer({ brightness: Number(e.target.value) })}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Contrast</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={selectedLayer.contrast}
                        onChange={(e) => updateSelectedLayer({ contrast: Number(e.target.value) })}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Saturation</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={selectedLayer.saturation}
                        onChange={(e) => updateSelectedLayer({ saturation: Number(e.target.value) })}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Grayscale */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Black & White</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.grayscale}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedLayer.grayscale}
                        onChange={(e) => updateSelectedLayer({ grayscale: Number(e.target.value) })}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Sepia Vintage */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Sepia Tone</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.sepia}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedLayer.sepia}
                        onChange={(e) => updateSelectedLayer({ sepia: Number(e.target.value) })}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Hue Rotate */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Hue Shift</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.hueRotate || 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={selectedLayer.hueRotate || 0}
                        onChange={(e) => updateSelectedLayer({ hueRotate: Number(e.target.value) })}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Reset Adjustments */}
                    <button
                      onClick={() =>
                        updateSelectedLayer({
                          brightness: 100,
                          contrast: 100,
                          saturation: 100,
                          blur: 0,
                          grayscale: 0,
                          sepia: 0,
                          invert: 0,
                          hueRotate: 0,
                        })
                      }
                      className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}

                {/* TAB 2: TRANSFORM & POSITION (PX ADJUSTMENT) */}
                {inspectorTab === 'transform' && (
                  <div className="space-y-4">
                    {/* Width & Height with Aspect Ratio Lock */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-[11px]">Dimensions (px)</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedLayer({ aspectRatioLocked: !selectedLayer.aspectRatioLocked })
                          }
                          className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200"
                        >
                          {selectedLayer.aspectRatioLocked ? (
                            <>
                              <Link className="w-3 h-3 text-lime-400" />
                              <span className="text-lime-400">Locked</span>
                            </>
                          ) : (
                            <>
                              <Unlink className="w-3 h-3" />
                              <span>Free</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-zinc-500 text-[10px]">W</label>
                          <input
                            type="number"
                            value={selectedLayer.width}
                            onChange={(e) => {
                              const val = Math.max(10, Number(e.target.value));
                              if (selectedLayer.aspectRatioLocked) {
                                const ratio = selectedLayer.width / selectedLayer.height;
                                updateSelectedLayer({ width: val, height: Math.round(val / ratio) });
                              } else {
                                updateSelectedLayer({ width: val });
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-zinc-500 text-[10px]">H</label>
                          <input
                            type="number"
                            value={selectedLayer.height}
                            onChange={(e) => {
                              const val = Math.max(10, Number(e.target.value));
                              if (selectedLayer.aspectRatioLocked) {
                                const ratio = selectedLayer.width / selectedLayer.height;
                                updateSelectedLayer({ height: val, width: Math.round(val * ratio) });
                              } else {
                                updateSelectedLayer({ height: val });
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Position X & Y */}
                    <div className="space-y-1">
                      <span className="text-zinc-400 text-[11px] block">Position Coordinates (px)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-zinc-500 text-[10px]">X</label>
                          <input
                            type="number"
                            value={selectedLayer.x}
                            onChange={(e) => updateSelectedLayer({ x: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-zinc-500 text-[10px]">Y</label>
                          <input
                            type="number"
                            value={selectedLayer.y}
                            onChange={(e) => updateSelectedLayer({ y: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rotation */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Rotation</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.rotation}°</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={selectedLayer.rotation}
                          onChange={(e) => updateSelectedLayer({ rotation: Number(e.target.value) })}
                          className="flex-1 accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => updateSelectedLayer({ rotation: (selectedLayer.rotation + 90) % 360 })}
                          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                          title="Rotate 90 deg"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Opacity */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Opacity</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.opacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedLayer.opacity}
                        onChange={(e) => updateSelectedLayer({ opacity: Number(e.target.value) })}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Flip buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => updateSelectedLayer({ flipX: !selectedLayer.flipX })}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 ${
                          selectedLayer.flipX
                            ? 'bg-lime-400/10 border-lime-400 text-lime-400'
                            : 'bg-zinc-800 border-transparent text-zinc-400'
                        }`}
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>Flip H</span>
                      </button>
                      <button
                        onClick={() => updateSelectedLayer({ flipY: !selectedLayer.flipY })}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 ${
                          selectedLayer.flipY
                            ? 'bg-lime-400/10 border-lime-400 text-lime-400'
                            : 'bg-zinc-800 border-transparent text-zinc-400'
                        }`}
                      >
                        <FlipVertical className="w-3.5 h-3.5" />
                        <span>Flip V</span>
                      </button>
                    </div>

                    {/* Alignment */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                      <label className="text-zinc-500 text-[11px] block">Align Layer</label>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => updateSelectedLayer({ x: 0 })}
                          className="py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-center"
                        >
                          Left
                        </button>
                        <button
                          onClick={() =>
                            updateSelectedLayer({ x: Math.round((canvasWidth - selectedLayer.width) / 2) })
                          }
                          className="py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-center"
                        >
                          Center
                        </button>
                        <button
                          onClick={() => updateSelectedLayer({ x: canvasWidth - selectedLayer.width })}
                          className="py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-center"
                        >
                          Right
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1">
                        <button
                          onClick={() => updateSelectedLayer({ y: 0 })}
                          className="py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-center"
                        >
                          Top
                        </button>
                        <button
                          onClick={() =>
                            updateSelectedLayer({ y: Math.round((canvasHeight - selectedLayer.height) / 2) })
                          }
                          className="py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-center"
                        >
                          Middle
                        </button>
                        <button
                          onClick={() => updateSelectedLayer({ y: canvasHeight - selectedLayer.height })}
                          className="py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-center"
                        >
                          Bottom
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: STYLE & SHAPE */}
                {inspectorTab === 'style' && (
                  <div className="space-y-4">
                    {/* Border Radius */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Corner Curvature</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.borderRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="120"
                        value={selectedLayer.borderRadius}
                        onChange={(e) => updateSelectedLayer({ borderRadius: Number(e.target.value) })}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Border Width & Color */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Border Outline</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.borderWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="24"
                        value={selectedLayer.borderWidth}
                        onChange={(e) => updateSelectedLayer({ borderWidth: Number(e.target.value) })}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                      {selectedLayer.borderWidth > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="color"
                            value={selectedLayer.borderColor}
                            onChange={(e) => updateSelectedLayer({ borderColor: e.target.value })}
                            className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer p-0"
                          />
                          <span className="font-mono text-zinc-300 text-xs">{selectedLayer.borderColor}</span>
                        </div>
                      )}
                    </div>

                    {/* Drop Shadow */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Drop Shadow</span>
                        <span className="font-mono text-zinc-200">{selectedLayer.shadowBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={selectedLayer.shadowBlur}
                        onChange={(e) => updateSelectedLayer({ shadowBlur: Number(e.target.value) })}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Text specific styling if text layer */}
                    {selectedLayer.type === 'text' && (
                      <div className="space-y-3 pt-3 border-t border-zinc-800">
                        <div className="space-y-1">
                          <label className="text-zinc-500 text-[11px]">Text Content</label>
                          <input
                            type="text"
                            value={selectedLayer.text || ''}
                            onChange={(e) => updateSelectedLayer({ text: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-zinc-500 text-[11px]">Font Size (px)</label>
                          <input
                            type="range"
                            min="16"
                            max="200"
                            value={selectedLayer.fontSize || 48}
                            onChange={(e) => updateSelectedLayer({ fontSize: Number(e.target.value) })}
                            className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-zinc-500 text-[11px]">Text Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={selectedLayer.fontColor || '#ffffff'}
                              onChange={(e) => updateSelectedLayer({ fontColor: e.target.value })}
                              className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer p-0"
                            />
                            <span className="font-mono text-zinc-300 text-xs">{selectedLayer.fontColor}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                <Sliders className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-zinc-300">No Layer Selected</h4>
                <p className="text-[11px] text-zinc-500 max-w-[180px]">
                  Click any image or text layer on the canvas to tune filters, resize corners, or adjust px.
                </p>
              </div>

              {/* Canvas Backdrop Color Settings */}
              <div className="w-full pt-4 border-t border-zinc-800 text-left space-y-2">
                <label className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">
                  Canvas Backdrop
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: 'Dark', color: '#141418' },
                    { label: 'White', color: '#ffffff' },
                    { label: 'Grey', color: '#27272a' },
                    { label: 'Transparent', color: 'transparent' },
                  ].map((bg) => (
                    <button
                      key={bg.label}
                      type="button"
                      onClick={() => setCanvasBgColor(bg.color)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                        canvasBgColor === bg.color
                          ? 'bg-lime-400/10 border-lime-400 text-lime-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Asset Picker Modal */}
      <AssetPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multiSelect={true}
        onSelect={(assets) => {
          if (assets.length > 0) {
            handleAddAssetsFromLibrary(assets);
          }
          setPickerOpen(false);
        }}
        title="Add Images to Canvas"
        description="Select photos from your library to place onto the multi-layer studio canvas."
      />

      {/* In-Canvas Layer Crop Modal */}
      <LayerCropModal
        open={cropModalOpen}
        layer={selectedLayer}
        onApply={handleApplyLayerCrop}
        onClose={() => setCropModalOpen(false)}
      />

      {/* Result Panel Modal for Composition Export */}
      {exportResult && (
        <ProcessingResultPanel
          sourceAsset={null}
          resultBlob={exportResult.blob}
          outputWidth={exportResult.width}
          outputHeight={exportResult.height}
          variantType="collage"
          metadata={{
            title: 'Studio Canvas Composition',
            layersCount: layers.length,
          }}
          onClose={() => setExportResult(null)}
        />
      )}
    </div>
  );
};
