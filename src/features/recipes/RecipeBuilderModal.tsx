import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Maximize2,
  FileCode,
  Sliders,
  Sparkles,
  Type,
  FolderOpen,
  Check,
} from 'lucide-react';
import { ImageRecipe, RecipeStep, RecipeStepType } from './types';
import { Project } from '@/types';

import { RecipeIcon } from './RecipeIcon';

interface RecipeBuilderModalProps {
  open: boolean;
  recipe: ImageRecipe | null;
  projects: Project[];
  onSave: (recipe: ImageRecipe) => void;
  onClose: () => void;
}

export const RecipeBuilderModal: React.FC<RecipeBuilderModalProps> = ({
  open,
  recipe,
  projects,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(recipe?.name || 'New Custom Recipe');
  const [description, setDescription] = useState(recipe?.description || '');
  const [category, setCategory] = useState<'ecommerce' | 'social' | 'web' | 'branding' | 'custom'>(
    recipe?.category || 'custom'
  );
  const [icon, setIcon] = useState(recipe?.icon || 'zap');
  const [targetProjectId, setTargetProjectId] = useState<string | undefined>(
    recipe?.targetProjectId || undefined
  );
  const [steps, setSteps] = useState<RecipeStep[]>(
    recipe?.steps || [
      {
        id: crypto.randomUUID(),
        type: 'resize',
        name: 'Resize to 1200 × 1200',
        enabled: true,
        params: { mode: 'fit', width: 1200, height: 1200 },
      },
      {
        id: crypto.randomUUID(),
        type: 'format',
        name: 'Convert to WebP',
        enabled: true,
        params: { format: 'image/webp', quality: 0.85 },
      },
    ]
  );

  if (!open) return null;

  const handleAddStep = (type: RecipeStepType) => {
    let newStep: RecipeStep;
    switch (type) {
      case 'resize':
        newStep = {
          id: crypto.randomUUID(),
          type: 'resize',
          name: 'Resize Dimension',
          enabled: true,
          params: { mode: 'fit', width: 1200, height: 1200 },
        };
        break;
      case 'format':
        newStep = {
          id: crypto.randomUUID(),
          type: 'format',
          name: 'Convert Format',
          enabled: true,
          params: { format: 'image/webp', quality: 0.85 },
        };
        break;
      case 'compress':
        newStep = {
          id: crypto.randomUUID(),
          type: 'compress',
          name: 'Compress Target (KB)',
          enabled: true,
          params: { targetKB: 150 },
        };
        break;
      case 'corners':
        newStep = {
          id: crypto.randomUUID(),
          type: 'corners',
          name: 'Rounded Corners',
          enabled: true,
          params: { radius: 16, isCircular: false },
        };
        break;
      case 'filter':
        newStep = {
          id: crypto.randomUUID(),
          type: 'filter',
          name: 'Image Filters',
          enabled: true,
          params: { brightness: 105, contrast: 105, saturation: 105, blur: 0, grayscale: false, sepia: false },
        };
        break;
      case 'watermark':
        newStep = {
          id: crypto.randomUUID(),
          type: 'watermark',
          name: 'Text Watermark',
          enabled: true,
          params: { text: 'SAMPLE', position: 'bottom-right', opacity: 0.4, fontSize: 28, color: '#ffffff' },
        };
        break;
      case 'backgroundRemove':
        newStep = {
          id: crypto.randomUUID(),
          type: 'backgroundRemove',
          name: 'Remove Background',
          enabled: true,
          params: { tolerance: 42 },
        };
        break;
    }

    setSteps((prev) => [...prev, newStep]);
  };

  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx > 0) {
      setSteps((prev) => {
        const copy = [...prev];
        const temp = copy[idx];
        copy[idx] = copy[idx - 1];
        copy[idx - 1] = temp;
        return copy;
      });
    } else if (direction === 'down' && idx < steps.length - 1) {
      setSteps((prev) => {
        const copy = [...prev];
        const temp = copy[idx];
        copy[idx] = copy[idx + 1];
        copy[idx + 1] = temp;
        return copy;
      });
    }
  };

  const handleDeleteStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateStepParams = (id: string, newParams: any) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, params: { ...s.params, ...newParams } } : s))
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const saved: ImageRecipe = {
      id: recipe?.id || crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      category,
      icon,
      targetProjectId,
      steps,
      isBuiltIn: false,
      createdAt: recipe?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#141418] border border-[#262632] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#121217]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{icon}</span>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                {recipe ? 'Edit Smart Recipe' : 'Create New Image Recipe'}
              </h3>
              <p className="text-xs text-zinc-500">
                Build an automated sequence of actions to apply in batch.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-zinc-400 font-medium">Icon</label>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <RecipeIcon name={icon} className="w-4 h-4 text-zinc-200" />
                </div>
                <select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  <option value="zap">Fast</option>
                  <option value="shopping-bag">Commerce</option>
                  <option value="smartphone">Mobile</option>
                  <option value="user">Avatar</option>
                  <option value="shield">Proof</option>
                  <option value="sparkles">AI</option>
                  <option value="layers">Layers</option>
                  <option value="crop">Crop</option>
                  <option value="sliders">Custom</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-6 space-y-1">
              <label className="text-zinc-400 font-medium">Recipe Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Product Image"
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-lime-400"
              />
            </div>

            <div className="sm:col-span-4 space-y-1">
              <label className="text-zinc-400 font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:border-lime-400 cursor-pointer"
              >
                <option value="ecommerce">E-Commerce</option>
                <option value="social">Social Media</option>
                <option value="web">Web Performance</option>
                <option value="branding">Branding</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="sm:col-span-12 space-y-1">
              <label className="text-zinc-400 font-medium">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of what this recipe does..."
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-lime-400"
              />
            </div>

            {/* Target Destination Project */}
            <div className="sm:col-span-12 space-y-1">
              <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-lime-400" />
                <span>Save Batch Results to Project (Optional)</span>
              </label>
              <select
                value={targetProjectId || ''}
                onChange={(e) => setTargetProjectId(e.target.value || undefined)}
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:border-lime-400 cursor-pointer"
              >
                <option value="">None (Download or Default Library)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sequential Step Pipeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Pipeline Steps ({steps.length})
              </h4>
              <span className="text-[11px] text-zinc-500">Executed sequentially top-to-bottom</span>
            </div>

            {steps.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
                No steps added yet. Choose an action below to add to the pipeline.
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col gap-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-lime-400/20 text-lime-400 text-[10px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-zinc-200 capitalize">{step.type}</span>
                        <span className="text-zinc-500 font-mono text-[10px]">({step.name})</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                          title="Move step up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, 'down')}
                          disabled={idx === steps.length - 1}
                          className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                          title="Move step down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStep(step.id)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400"
                          title="Remove step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Step Specific Parameter Controls */}
                    <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      {step.type === 'resize' && (
                        <>
                          <div className="space-y-0.5">
                            <label className="text-zinc-500">Width</label>
                            <input
                              type="number"
                              value={step.params.width}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { width: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 font-mono"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-zinc-500">Height</label>
                            <input
                              type="number"
                              value={step.params.height}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { height: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 font-mono"
                            />
                          </div>
                          <div className="col-span-2 space-y-0.5">
                            <label className="text-zinc-500">Mode</label>
                            <select
                              value={step.params.mode}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { mode: e.target.value })
                              }
                              className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-300"
                            >
                              <option value="fit">Fit / Contain (Preserve ratio)</option>
                              <option value="fill">Fill / Crop to Exact Size</option>
                              <option value="exact">Stretch Exact</option>
                            </select>
                          </div>
                        </>
                      )}

                      {step.type === 'format' && (
                        <>
                          <div className="col-span-2 space-y-0.5">
                            <label className="text-zinc-500">Target Format</label>
                            <select
                              value={step.params.format}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { format: e.target.value })
                              }
                              className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-300"
                            >
                              <option value="image/webp">WebP (Modern & Compact)</option>
                              <option value="image/jpeg">JPEG (Standard Photo)</option>
                              <option value="image/png">PNG (Lossless / Alpha)</option>
                            </select>
                          </div>
                          <div className="col-span-2 space-y-0.5">
                            <div className="flex justify-between text-zinc-400">
                              <span>Quality</span>
                              <span className="font-mono">{Math.round(step.params.quality * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.05"
                              value={step.params.quality}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { quality: Number(e.target.value) })
                              }
                              className="w-full accent-lime-400 h-1 bg-zinc-800 rounded"
                            />
                          </div>
                        </>
                      )}

                      {step.type === 'compress' && (
                        <div className="col-span-4 space-y-0.5">
                          <label className="text-zinc-500">Target File Size (KB)</label>
                          <input
                            type="number"
                            value={step.params.targetKB}
                            onChange={(e) =>
                              handleUpdateStepParams(step.id, { targetKB: Number(e.target.value) })
                            }
                            placeholder="e.g. 150"
                            className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 font-mono"
                          />
                        </div>
                      )}

                      {step.type === 'corners' && (
                        <>
                          <div className="col-span-2 space-y-0.5">
                            <label className="text-zinc-500">Corner Radius (px)</label>
                            <input
                              type="number"
                              value={step.params.radius}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { radius: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 font-mono"
                            />
                          </div>
                          <div className="col-span-2 flex items-center gap-2 pt-3">
                            <input
                              type="checkbox"
                              id={`circle-${step.id}`}
                              checked={step.params.isCircular || false}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { isCircular: e.target.checked })
                              }
                              className="accent-lime-400"
                            />
                            <label htmlFor={`circle-${step.id}`} className="text-zinc-300">
                              Perfect Circle Mask
                            </label>
                          </div>
                        </>
                      )}

                      {step.type === 'watermark' && (
                        <>
                          <div className="col-span-2 space-y-0.5">
                            <label className="text-zinc-500">Watermark Text</label>
                            <input
                              type="text"
                              value={step.params.text}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { text: e.target.value })
                              }
                              className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200"
                            />
                          </div>
                          <div className="col-span-2 space-y-0.5">
                            <label className="text-zinc-500">Position</label>
                            <select
                              value={step.params.position}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { position: e.target.value })
                              }
                              className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-300"
                            >
                              <option value="bottom-right">Bottom Right</option>
                              <option value="center">Center</option>
                              <option value="top-right">Top Right</option>
                              <option value="bottom-left">Bottom Left</option>
                            </select>
                          </div>
                        </>
                      )}

                      {step.type === 'filter' && (
                        <>
                          <div className="space-y-0.5">
                            <label className="text-zinc-500">Brightness</label>
                            <input
                              type="number"
                              value={step.params.brightness}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { brightness: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 font-mono"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-zinc-500">Contrast</label>
                            <input
                              type="number"
                              value={step.params.contrast}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { contrast: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 font-mono"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-zinc-500">Saturation</label>
                            <input
                              type="number"
                              value={step.params.saturation}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { saturation: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 font-mono"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-zinc-500">Blur (px)</label>
                            <input
                              type="number"
                              value={step.params.blur}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { blur: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 font-mono"
                            />
                          </div>
                        </>
                      )}

                      {step.type === 'backgroundRemove' && (
                        <div className="col-span-4 text-zinc-400">
                          Auto transparent background removal using boundary keying.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Step Buttons */}
            <div className="pt-2">
              <span className="text-[11px] text-zinc-500 block mb-2 font-medium">Add Action to Recipe:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { type: 'resize', label: 'Resize', icon: Maximize2 },
                  { type: 'format', label: 'Convert Format', icon: FileCode },
                  { type: 'compress', label: 'Compress KB', icon: Sliders },
                  { type: 'corners', label: 'Rounded Corners', icon: Sparkles },
                  { type: 'filter', label: 'Filters', icon: Sliders },
                  { type: 'watermark', label: 'Watermark', icon: Type },
                  { type: 'backgroundRemove', label: 'Remove BG', icon: Sparkles },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleAddStep(item.type as RecipeStepType)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 text-[11px] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-lime-400" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between bg-[#121217]">
          <span className="text-zinc-500 text-xs">
            {steps.length} step(s) will be executed for every selected image.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-lime-400 hover:bg-lime-300 text-black text-xs font-bold rounded-lg transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Recipe</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
