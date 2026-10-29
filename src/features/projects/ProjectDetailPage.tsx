import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { AssetCard } from '@/components/asset-grid/AssetCard';
import { AssetPreviewModal } from '@/components/dialogs/AssetPreviewModal';
import { UploadDropzone } from '@/components/common/UploadDropzone';
import { BatchActionBar } from '@/components/asset-grid/BatchActionBar';
import { ArrowLeft, UploadCloud, Trash2, Images } from 'lucide-react';
import { useAssetStore } from '@/stores/assetStore';
import { useProjectStore } from '@/stores/projectStore';
import { ImageAsset, Project } from '@/types';
import { useDynamicDocumentTitle } from '@/hooks/useDynamicDocumentTitle';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { assets, fetchAssets } = useAssetStore();
  const { projects, fetchProjects, deleteProject } = useProjectStore();

  const [project, setProject] = useState<Project | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<ImageAsset | null>(null);

  useDynamicDocumentTitle(project ? `${project.name}` : undefined);

  useEffect(() => {
    fetchProjects();
    if (id) {
      fetchAssets({ projectId: id, isTrash: false });
    }
  }, [id, fetchAssets, fetchProjects]);

  useEffect(() => {
    if (id && projects.length > 0) {
      const p = projects.find((item) => item.id === id);
      setProject(p || null);
    }
  }, [id, projects]);

  const handleDeleteProject = async () => {
    if (!project) return;
    if (confirm(`Are you sure you want to delete project "${project.name}"? Assets will be retained in library.`)) {
      await deleteProject(project.id, false);
      navigate('/projects');
    }
  };

  const projectAssets = assets.filter((a) => a.projectId === id && !a.isTrash);

  return (
    <div className="space-y-6 pb-20">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>

      <PageHeader
        title={project ? project.name : 'Project'}
        description={project?.description || 'Project assets and resources'}
        badge={
          <span className="px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 text-xs font-semibold border border-lime-400/20">
            {projectAssets.length} image{projectAssets.length === 1 ? '' : 's'}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteProject}
              className="p-2 rounded-lg bg-zinc-800/80 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-zinc-700 transition-colors"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowUploadZone(!showUploadZone)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-semibold shadow-sm transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{showUploadZone ? 'Hide Dropzone' : 'Upload to Project'}</span>
            </button>
          </div>
        }
      />

      {/* Expandable Project Dropzone */}
      {showUploadZone && (
        <div className="p-4 rounded-xl bg-[#121217] border border-[#23232c]">
          <UploadDropzone
            projectId={id || null}
            compact
            onUploadComplete={() => {
              if (id) fetchAssets({ projectId: id, isTrash: false });
            }}
          />
        </div>
      )}

      {/* Asset Grid */}
      {projectAssets.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No images in this project yet"
          description="Drag and drop image files or click Upload to attach assets to this project."
          action={{
            label: "Upload Images",
            onClick: () => setShowUploadZone(true),
            icon: UploadCloud,
          }}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {projectAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onOpenPreview={setPreviewAsset} />
          ))}
        </div>
      )}

      <BatchActionBar />

      {previewAsset && (
        <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      )}
    </div>
  );
};
