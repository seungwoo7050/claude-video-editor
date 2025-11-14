/**
 * Thumbnail extraction routes
 * Uses native C++ addon for high-performance thumbnail generation
 */

import express, { Request, Response } from 'express';
import { nativeVideoService } from '../services/native-video.service.js';
import { metricsService } from '../services/metrics.service.js';

const router = express.Router();

/**
 * POST /api/thumbnail
 * Extract thumbnail from uploaded video
 *
 * Body:
 * - videoPath: string (path to video file)
 * - timestamp: number (seconds)
 * - width?: number (optional, 0 = keep original)
 * - height?: number (optional, 0 = keep original)
 *
 * Returns: PNG/JPEG image
 */
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    if (!nativeVideoService.isAvailable()) {
      return res.status(503).json({
        error: 'Native video processing not available',
        message: 'C++ native addon is not loaded. Thumbnail extraction is unavailable.',
      });
    }

    const { videoPath, timestamp, width = 0, height = 0 } = req.body;

    // Validate input
    if (!videoPath) {
      return res.status(400).json({ error: 'videoPath is required' });
    }

    if (timestamp === undefined || timestamp === null) {
      return res.status(400).json({ error: 'timestamp is required' });
    }

    if (typeof timestamp !== 'number' || timestamp < 0) {
      return res.status(400).json({ error: 'timestamp must be a positive number' });
    }

    // Extract thumbnail
    const thumbnailBuffer = await nativeVideoService.extractThumbnail(
      videoPath,
      timestamp,
      width,
      height
    );

    // Record metrics
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    metricsService.recordThumbnailExtraction(duration, true);

    // Update cache stats if available
    const stats = nativeVideoService.getThumbnailStats();
    metricsService.updateThumbnailCacheStats(stats.cacheHits, stats.cacheMisses);

    // For now, return raw RGB data
    // In production, you would convert to JPEG/PNG
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="thumbnail-${timestamp}s.rgb"`);
    return res.send(thumbnailBuffer);

  } catch (err) {
    // Record error metrics
    const duration = (Date.now() - startTime) / 1000;
    metricsService.recordThumbnailExtraction(duration, false);
    metricsService.recordError('thumbnail', err instanceof Error ? err.name : 'UnknownError');

    console.error('[Thumbnail] Error:', err);
    return res.status(500).json({
      error: 'Failed to extract thumbnail',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/thumbnail/stats
 * Get thumbnail extraction statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    if (!nativeVideoService.isAvailable()) {
      return res.status(503).json({
        error: 'Native video processing not available',
      });
    }

    const stats = nativeVideoService.getThumbnailStats();
    return res.json(stats);

  } catch (err) {
    console.error('[Thumbnail Stats] Error:', err);
    return res.status(500).json({
      error: 'Failed to get thumbnail stats',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/thumbnail/health
 * Check if thumbnail service is available
 */
router.get('/health', (req: Request, res: Response) => {
  const available = nativeVideoService.isAvailable();

  if (available) {
    res.json({
      status: 'ok',
      available: true,
      version: nativeVideoService.getVersion(),
    });
  } else {
    res.status(503).json({
      status: 'unavailable',
      available: false,
      message: 'Native module not loaded',
    });
  }
});

export default router;
