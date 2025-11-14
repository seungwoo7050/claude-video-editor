/**
 * Video metadata extraction routes
 * Uses native C++ addon for fast metadata analysis
 */

import express, { Request, Response } from 'express';
import { nativeVideoService, NativeVideoService } from '../services/native-video.service.js';
import { metricsService } from '../services/metrics.service.js';

const router = express.Router();

/**
 * POST /api/metadata
 * Extract complete metadata from video file
 *
 * Body:
 * - videoPath: string (path to video file)
 *
 * Returns: VideoMetadata object
 */
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    if (!nativeVideoService.isAvailable()) {
      return res.status(503).json({
        error: 'Native video processing not available',
        message: 'C++ native addon is not loaded. Metadata extraction is unavailable.',
      });
    }

    const { videoPath } = req.body;

    // Validate input
    if (!videoPath) {
      return res.status(400).json({ error: 'videoPath is required' });
    }

    // Extract metadata
    const metadata = await nativeVideoService.extractMetadata(videoPath);

    // Record metrics
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    metricsService.recordMetadataExtraction(duration, true);

    return res.json({
      success: true,
      metadata,
    });

  } catch (err) {
    // Record error metrics
    const duration = (Date.now() - startTime) / 1000;
    metricsService.recordMetadataExtraction(duration, false);
    metricsService.recordError('metadata', err instanceof Error ? err.name : 'UnknownError');

    console.error('[Metadata] Error:', err);
    return res.status(500).json({
      error: 'Failed to extract metadata',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metadata/codec/:codecName
 * Check if a codec is supported
 */
router.get('/codec/:codecName', (req: Request, res: Response) => {
  try {
    const { codecName } = req.params;

    if (!codecName) {
      return res.status(400).json({ error: 'codecName is required' });
    }

    const supported = NativeVideoService.isCodecSupported(codecName);

    return res.json({
      codec: codecName,
      supported,
    });

  } catch (err) {
    console.error('[Codec Check] Error:', err);
    return res.status(500).json({
      error: 'Failed to check codec support',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metadata/health
 * Check if metadata service is available
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
