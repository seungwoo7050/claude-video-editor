import { Router, Request, Response } from 'express';
import { db } from '../db/database.service.js';

const router = Router();

/**
 * Project interface
 */
interface Project {
  id: number;
  name: string;
  description: string | null;
  video_filename: string;
  video_url: string;
  timeline_state: object;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create a new project
 * POST /api/projects
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, videoFilename, videoUrl, timelineState } = req.body;

    if (!name || !videoFilename || !videoUrl) {
      res.status(400).json({
        error: 'Missing required fields: name, videoFilename, videoUrl',
      });
      return;
    }

    const project = await db.queryOne<Project>(
      `INSERT INTO projects (name, description, video_filename, video_url, timeline_state)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description || null, videoFilename, videoUrl, JSON.stringify(timelineState || {})]
    );

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * Get all projects
 * GET /api/projects
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const projects = await db.query<Project>(
      'SELECT * FROM projects ORDER BY updated_at DESC'
    );

    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

/**
 * Get a single project by ID
 * GET /api/projects/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await db.queryOne<Project>(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

/**
 * Update a project
 * PUT /api/projects/:id
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, timelineState } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (timelineState !== undefined) {
      updates.push(`timeline_state = $${paramIndex++}`);
      values.push(JSON.stringify(timelineState));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(id);

    const project = await db.queryOne<Project>(
      `UPDATE projects SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * Delete a project
 * DELETE /api/projects/:id
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await db.queryOne<Project>(
      'DELETE FROM projects WHERE id = $1 RETURNING *',
      [id]
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ message: 'Project deleted', project });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
