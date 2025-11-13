import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface TimelineState {
  currentTime: number;
  duration: number;
  [key: string]: unknown;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  video_filename: string;
  video_url: string;
  timeline_state: TimelineState;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectParams {
  name: string;
  description?: string;
  videoFilename: string;
  videoUrl: string;
  timelineState?: TimelineState;
}

/**
 * Hook for project CRUD operations
 */
export function useProjects() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = async (params: CreateProjectParams): Promise<Project | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const project = await response.json();
      setLoading(false);
      return project;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMsg);
      setLoading(false);
      return null;
    }
  };

  const getProjects = async (): Promise<Project[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/projects`);

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const projects = await response.json();
      setLoading(false);
      return projects;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMsg);
      setLoading(false);
      return [];
    }
  };

  const getProject = async (id: number): Promise<Project | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }

      const project = await response.json();
      setLoading(false);
      return project;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch project';
      setError(errorMsg);
      setLoading(false);
      return null;
    }
  };

  const updateProject = async (id: number, updates: Partial<CreateProjectParams>): Promise<Project | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project');
      }

      const project = await response.json();
      setLoading(false);
      return project;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMsg);
      setLoading(false);
      return null;
    }
  };

  const deleteProject = async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      setLoading(false);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMsg);
      setLoading(false);
      return false;
    }
  };

  return {
    createProject,
    getProjects,
    getProject,
    updateProject,
    deleteProject,
    loading,
    error,
  };
}
