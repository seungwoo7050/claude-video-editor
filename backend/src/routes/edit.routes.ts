import { Router, Request, Response } from 'express';
import { FFmpegService } from '../services/ffmpeg.service.js';
import { StorageService } from '../services/storage.service.js';

const router = Router();
const storageService = new StorageService();
const ffmpegService = new FFmpegService(storageService);

/**
 * Trim video from start time to end time
 * POST /api/edit/trim
 * Body: { filename: string, startTime: number, endTime: number }
 */
router.post('/trim', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename, startTime, endTime } = req.body;

    if (!filename || startTime === undefined || endTime === undefined) {
      res.status(400).json({
        error: 'Missing required fields: filename, startTime, endTime',
      });
      return;
    }

    if (startTime < 0 || endTime <= startTime) {
      res.status(400).json({
        error: 'Invalid time range: endTime must be greater than startTime',
      });
      return;
    }

    const inputPath = storageService.getFilePath(filename);
    const fileExists = await storageService.fileExists(filename);

    if (!fileExists) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }

    const result = await ffmpegService.trimVideo(
      inputPath,
      startTime,
      undefined,
      endTime
    );

    // Include API URL in response
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    res.json({
      ...result,
      url: `${apiUrl}${result.url}`,
    });
  } catch (error) {
    console.error('Trim error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to trim video';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * Split video at a specific time into two files
 * POST /api/edit/split
 * Body: { filename: string, splitTime: number }
 */
router.post('/split', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename, splitTime } = req.body;

    if (!filename || splitTime === undefined) {
      res.status(400).json({
        error: 'Missing required fields: filename, splitTime',
      });
      return;
    }

    if (splitTime <= 0) {
      res.status(400).json({
        error: 'Invalid split time: must be greater than 0',
      });
      return;
    }

    const inputPath = storageService.getFilePath(filename);
    const fileExists = await storageService.fileExists(filename);

    if (!fileExists) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }

    const results = await ffmpegService.splitVideo(inputPath, splitTime);

    // Include API URL in response
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    res.json({
      parts: results.map((result) => ({
        ...result,
        url: `${apiUrl}${result.url}`,
      })),
    });
  } catch (error) {
    console.error('Split error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to split video';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * Get video metadata
 * GET /api/edit/metadata/:filename
 */
router.get('/metadata/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;

    const inputPath = storageService.getFilePath(filename);
    const fileExists = await storageService.fileExists(filename);

    if (!fileExists) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }

    const metadata = await ffmpegService.getVideoMetadata(inputPath);
    res.json(metadata);
  } catch (error) {
    console.error('Metadata error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get metadata';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * Process video with subtitles and/or speed change
 * POST /api/edit/process
 * Body: { filename: string, subtitles?: Subtitle[], speed?: number }
 */
router.post('/process', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename, subtitles, speed } = req.body;

    if (!filename) {
      res.status(400).json({ error: 'Missing required field: filename' });
      return;
    }

    if (!subtitles && !speed) {
      res.status(400).json({
        error: 'At least one of subtitles or speed must be provided',
      });
      return;
    }

    if (speed && (speed < 0.5 || speed > 2.0)) {
      res.status(400).json({
        error: 'Speed must be between 0.5 and 2.0',
      });
      return;
    }

    const inputPath = storageService.getFilePath(filename);
    const fileExists = await storageService.fileExists(filename);

    if (!fileExists) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }

    const result = await ffmpegService.addSubtitlesAndSpeed(
      inputPath,
      subtitles || [],
      speed
    );

    // Include API URL in response
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    res.json({
      ...result,
      url: `${apiUrl}${result.url}`,
    });
  } catch (error) {
    console.error('Process error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process video';
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
