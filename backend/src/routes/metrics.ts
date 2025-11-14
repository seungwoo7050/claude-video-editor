/**
 * Prometheus metrics endpoint
 */

import express, { Request, Response } from 'express';
import { metricsService } from '../services/metrics.service';

const router = express.Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetrics();

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (err) {
    console.error('[Metrics] Error:', err);
    res.status(500).send('Error generating metrics');
  }
});

export default router;
