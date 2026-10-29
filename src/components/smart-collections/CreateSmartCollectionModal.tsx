import React, { useState } from 'react';
import { X, Plus, Trash2, Sparkles, Check } from 'lucide-react';
import {
  SmartCollection,
  SmartCollectionRule,
  CollectionFilterField,
  CollectionFilterOperator,
} from '@/types/smartCollection';
import { smartCollectionService } from '@/services/storage/smartCollectionService';
import { useAssetStore } from '@/stores/assetStore';
import { toast } from 'sonner';

interface CreateSmartCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (collection: SmartCollection) => void;
}

export const CreateSmartCollectionModal: React.FC<CreateSmartCollectionModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { assets } = useAssetStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('lime');
  const [matchType, setMatchType] = useState<'all' | 'any'>('all');
  const [rules, setRules] = useState<SmartCollectionRule[]>([
    {
      id: crypto.randomUUID(),
      field: 'mimeType',
      operator: 'equals',
      value: 'image/png',
    },
  ]);

  if (!isOpen) return null;

  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        field: 'currentSize',
        operator: 'greater_than',
        value: 1048576,
      },
    ]);
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRule = (
    id: string,
    patch: Partial<SmartCollectionRule>
  ) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  // Live preview matching count against current library assets
  const tempCollection: SmartCollection = {
    id: 'temp',
    name,
    description,
    color,
    matchType,
    rules,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const matchingAssetsCount = assets.filter((a) =>
    smartCollectionService.evaluateAsset(a, tempCollection)
  ).length;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a collection name');
      return;
    }
    if (rules.length === 0) {
      toast.error('Add at least one rule');
      return;
    }

    const newCollection: SmartCollection = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      color,
      matchType,
      rules,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await smartCollectionService.saveCollection(newCollection);
    toast.success(`Created dynamic collection "${newCollection.name}"`);
    onCreated(newCollection);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-[#131317] border border-[#272736] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="p-4 border-b border-[#23232c] flex items-center justify-between bg-[#15151c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-lime-400/15 border border-lime-400/30 flex items-center justify-center text-lime-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-100">Create Smart Asset Collection</h3>
              <p className="text-[11px] text-zinc-400">Dynamic, self-updating query collection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh] text-xs">
          <div className="space-y-1.5">
            <label className="text-zinc-300 font-medium">Collection Name</label>
            <input
              type="text"
              placeholder='e.g. "Uncompressed PNGs over 2 MB"'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#2b2b3a] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lime-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-400">Description (Optional)</label>
            <input
              type="text"
              placeholder="Brief summary of criteria"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e0e12] border border-[#2b2b3a] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lime-400"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-zinc-400">Badge Accent:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'lime', bg: 'bg-lime-400' },
                { id: 'emerald', bg: 'bg-emerald-400' },
                { id: 'cyan', bg: 'bg-cyan-400' },
                { id: 'purple', bg: 'bg-purple-400' },
                { id: 'amber', bg: 'bg-amber-400' },
                { id: 'pink', bg: 'bg-pink-400' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-4 h-4 rounded-full ${c.bg} transition-transform ${
                    color === c.id ? 'ring-2 ring-white scale-125' : 'opacity-50 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Match Rule Type */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-zinc-300 font-medium">Match Condition</label>
            <div className="flex items-center bg-[#0d0d11] p-0.5 rounded-lg border border-[#262634]">
              <button
                type="button"
                onClick={() => setMatchType('all')}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  matchType === 'all'
                    ? 'bg-zinc-800 text-lime-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Match ALL Rules (AND)
              </button>
              <button
                type="button"
                onClick={() => setMatchType('any')}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  matchType === 'any'
                    ? 'bg-zinc-800 text-lime-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Match ANY Rule (OR)
              </button>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-400 font-medium">Dynamic Filter Rules</label>
              <button
                type="button"
                onClick={handleAddRule}
                className="flex items-center gap-1 text-[11px] text-lime-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule</span>
              </button>
            </div>

            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0e0e12] border border-[#252532]"
                >
                  {/* Field */}
                  <select
                    value={rule.field}
                    onChange={(e) =>
                      handleUpdateRule(rule.id, {
                        field: e.target.value as CollectionFilterField,
                      })
                    }
                    className="w-1/3 px-2 py-1.5 rounded bg-[#16161c] border border-zinc-800 text-zinc-200 text-xs"
                  >
                    <option value="mimeType">Format (MIME)</option>
                    <option value="currentSize">File Size (Bytes)</option>
                    <option value="width">Width (px)</option>
                    <option value="height">Height (px)</option>
                    <option value="variantType">Derived Variant</option>
                    <option value="originalAssetId">Original / Master</option>
                    <option value="isFavorite">Favorite</option>
                  </select>

                  {/* Operator */}
                  <select
                    value={rule.operator}
                    onChange={(e) =>
                      handleUpdateRule(rule.id, {
                        operator: e.target.value as CollectionFilterOperator,
                      })
                    }
                    className="w-1/3 px-2 py-1.5 rounded bg-[#16161c] border border-zinc-800 text-zinc-200 text-xs"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Does not equal</option>
                    <option value="greater_than">Greater than (&gt;)</option>
                    <option value="less_than">Less than (&lt;)</option>
                    <option value="contains">Contains</option>
                    <option value="is_null">Is empty / None</option>
                    <option value="is_not_null">Exists / Any</option>
                  </select>

                  {/* Value */}
                  {rule.operator !== 'is_null' && rule.operator !== 'is_not_null' && (
                    <input
                      type={rule.field === 'currentSize' || rule.field === 'width' || rule.field === 'height' ? 'number' : 'text'}
                      value={rule.value as any}
                      onChange={(e) =>
                        handleUpdateRule(rule.id, { value: e.target.value })
                      }
                      className="flex-1 px-2 py-1.5 rounded bg-[#16161c] border border-zinc-800 text-zinc-200 text-xs font-mono"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveRule(rule.id)}
                    disabled={rules.length === 1}
                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Live Preview Match Badge */}
          <div className="p-3 rounded-xl bg-lime-400/5 border border-lime-400/20 flex items-center justify-between">
            <span className="text-zinc-300">Live Matching Assets in Library:</span>
            <span className="font-mono font-bold text-lime-400 text-xs">
              {matchingAssetsCount} items
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#23232c] flex items-center justify-between bg-[#15151c]">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black font-semibold text-xs transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Create Collection</span>
          </button>
        </div>
      </div>
    </div>
  );
};
