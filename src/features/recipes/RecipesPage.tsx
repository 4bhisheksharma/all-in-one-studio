import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Play,
  Edit2,
  Copy,
  Trash2,
  FolderOpen,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { ImageRecipe } from './types';
import { recipeService } from '@/services/storage/recipeService';
import { projectService } from '@/services/storage/projectService';
import { Project } from '@/types';
import { RecipeBuilderModal } from './RecipeBuilderModal';
import { BatchExecutionModal } from './BatchExecutionModal';
import { RecipeIcon } from './RecipeIcon';
import { toast } from 'sonner';

export const RecipesPage: React.FC = () => {
  const [recipes, setRecipes] = useState<ImageRecipe[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Modals
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<ImageRecipe | null>(null);

  const [batchOpen, setBatchOpen] = useState(false);
  const [activeBatchRecipe, setActiveBatchRecipe] = useState<ImageRecipe | null>(null);

  // Load recipes and projects
  const loadData = async () => {
    setLoading(true);
    try {
      const [recs, projs] = await Promise.all([
        recipeService.getRecipes(),
        projectService.listProjects(),
      ]);
      setRecipes(recs);
      setProjects(projs);
    } catch {
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRecipe = () => {
    setEditingRecipe(null);
    setBuilderOpen(true);
  };

  const handleEditRecipe = (recipe: ImageRecipe) => {
    setEditingRecipe(recipe);
    setBuilderOpen(true);
  };

  const handleDuplicateRecipe = async (recipe: ImageRecipe) => {
    const cloned = await recipeService.duplicateRecipe(recipe.id);
    if (cloned) {
      toast.success(`Duplicated "${recipe.name}"`);
      loadData();
    }
  };

  const handleDeleteRecipe = async (recipe: ImageRecipe) => {
    await recipeService.deleteRecipe(recipe.id);
    toast.info(`Deleted recipe "${recipe.name}"`);
    loadData();
  };

  const handleSaveRecipe = async (saved: ImageRecipe) => {
    await recipeService.saveRecipe(saved);
    toast.success(`Saved recipe "${saved.name}"`);
    loadData();
  };

  const handleRunBatch = (recipe: ImageRecipe) => {
    setActiveBatchRecipe(recipe);
    setBatchOpen(true);
  };

  const filteredRecipes = recipes.filter((r) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'custom') return !r.isBuiltIn;
    return r.category === activeCategory;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-[#22222a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Smart Image Recipes</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium uppercase border border-zinc-200 dark:border-zinc-700">
                Automation
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl">
              Save complete sequences of image operations as reusable recipes. Apply to 50+ images in one action.
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateRecipe}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Recipe</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1 shrink-0" />
        {[
          { id: 'all', label: 'All Recipes' },
          { id: 'ecommerce', label: 'E-Commerce' },
          { id: 'social', label: 'Social Media' },
          { id: 'web', label: 'Web Performance' },
          { id: 'branding', label: 'Branding' },
          { id: 'custom', label: 'Custom Recipes' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Recipes Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 text-xs">Loading smart recipes...</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 bg-[#121217] rounded-2xl border border-zinc-800 space-y-3">
          <p className="text-sm font-semibold text-zinc-300">No recipes found in this category</p>
          <button
            onClick={handleCreateRecipe}
            className="px-3.5 py-1.5 bg-zinc-100 text-zinc-900 font-semibold text-xs rounded-lg cursor-pointer hover:bg-white"
          >
            Create Your First Custom Recipe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecipes.map((recipe) => {
            const targetProject = projects.find((p) => p.id === recipe.targetProjectId);
            const isFeatured = recipe.id === 'starter-product-image';

            return (
              <div
                key={recipe.id}
                className="flex flex-col justify-between p-5 rounded-2xl border transition-all bg-[#141419] border-[#262632] hover:border-zinc-700"
              >
                {/* Card Top Section */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                        <RecipeIcon name={recipe.icon} className="w-5 h-5 text-zinc-200" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm text-zinc-100">{recipe.name}</h3>
                          {isFeatured && (
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                              Featured
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-medium capitalize">
                          {recipe.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditRecipe(recipe)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title="Edit recipe steps"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicateRecipe(recipe)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title="Duplicate recipe"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {!recipe.isBuiltIn && (
                        <button
                          onClick={() => handleDeleteRecipe(recipe)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                          title="Delete custom recipe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed min-h-9">
                    {recipe.description}
                  </p>

                  {/* Visual Sequence of Steps */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                      Sequence ({recipe.steps.filter((s) => s.enabled).length} Steps)
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {recipe.steps
                        .filter((s) => s.enabled)
                        .map((step, idx) => (
                          <React.Fragment key={step.id}>
                            <div className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-medium">
                              {step.name}
                            </div>
                            {idx < recipe.steps.filter((s) => s.enabled).length - 1 && (
                              <ArrowRight className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                    </div>
                  </div>

                  {/* Target Project Tag */}
                  {targetProject && (
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/60 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800/80">
                      <FolderOpen className="w-3 h-3 text-zinc-500" />
                      <span>Saves into: <strong className="text-zinc-800 dark:text-zinc-200">{targetProject.name}</strong></span>
                    </div>
                  )}
                </div>

                {/* Card Bottom: Batch Execute Button */}
                <div className="pt-5 mt-4 border-t border-zinc-200 dark:border-[#22222a]">
                  <button
                    onClick={() => handleRunBatch(recipe)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Recipe (Batch Process)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <RecipeBuilderModal
        open={builderOpen}
        recipe={editingRecipe}
        projects={projects}
        onSave={handleSaveRecipe}
        onClose={() => setBuilderOpen(false)}
      />

      <BatchExecutionModal
        open={batchOpen}
        recipe={activeBatchRecipe}
        projects={projects}
        onClose={() => setBatchOpen(false)}
      />
    </div>
  );
};
