/**
 * Prometheus metrics endpoint
 */

import express, { Request, Response } from 'express';
import { metricsService } from '../services/metrics.service.js';

const router = express.Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetrics();

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.send(metrics);
  } catch (err) {
    console.error('[Metrics] Error:', err);
    return res.status(500).send('Error generating metrics');
  }
});

export default router;
