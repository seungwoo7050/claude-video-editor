import { useState, useEffect } from 'react';
import { useProjects, Project } from '../hooks/useProjects';
import { VideoMetadata } from '../types/video';

interface ProjectPanelProps {
  video: VideoMetadata | null;
  onProjectLoad: (project: Project) => void;
}

/**
 * Project management panel for saving and loading projects
 */
export function ProjectPanel({ video, onProjectLoad }: ProjectPanelProps) {
  const { createProject, getProjects, deleteProject, loading } = useProjects();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const loadProjects = async () => {
    const fetchedProjects = await getProjects();
    setProjects(fetchedProjects);
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!video || !projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    const project = await createProject({
      name: projectName.trim(),
      videoFilename: video.filename,
      videoUrl: video.url,
      timelineState: {
        currentTime: 0,
        duration: video.duration || 0,
      },
    });

    if (project) {
      setProjectName('');
      setShowSaveForm(false);
      await loadProjects();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      const success = await deleteProject(id);
      if (success) {
        await loadProjects();
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Projects</h3>

      {/* Save Project */}
      {video && (
        <div className="mb-4">
          {!showSaveForm ? (
            <button
              onClick={() => setShowSaveForm(true)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              💾 Save Project
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSaveForm(false)}
                  className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project List */}
      <div className="space-y-2">
        <div className="text-sm text-gray-400">
          {projects.length} saved project{projects.length !== 1 ? 's' : ''}
        </div>

        {projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project.id}
              className="p-3 bg-gray-700 rounded space-y-2"
            >
              <div className="font-medium">{project.name}</div>
              {project.description && (
                <div className="text-sm text-gray-400">{project.description}</div>
              )}
              <div className="text-xs text-gray-500">
                {new Date(project.created_at).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onProjectLoad(project)}
                  className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                >
                  Load
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500 text-center py-4">
            No saved projects yet
          </div>
        )}
      </div>
    </div>
  );
}
