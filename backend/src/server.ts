import express from 'express';
import cors from 'cors';
import http from 'http';
import uploadRoutes from './routes/upload.routes.js';
import editRoutes from './routes/edit.routes.js';
import projectRoutes from './routes/project.routes.js';
import thumbnailRoutes from './routes/thumbnail.js';
import metadataRoutes from './routes/metadata.js';
import metricsRoutes from './routes/metrics.js';
import { StorageService } from './services/storage.service.js';
import { WebSocketService } from './ws/websocket.service.js';
import { db } from './db/database.service.js';
import { redis } from './db/redis.service.js';
import { nativeVideoService } from './services/native-video.service.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server for WebSocket
const server = http.createServer(app);

const storageService = new StorageService();

// Initialize WebSocket service
const wsService = new WebSocketService(server);

// Make WebSocket service available globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).wsService = wsService;

// Middleware
app.use(cors());
app.use(express.json());

// Static file serving for uploaded videos
app.use('/videos', express.static(storageService.getUploadDir()));

// Routes
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'vrewcraft-backend',
    websocket: {
      connected: wsService.getClientCount(),
    },
    native: {
      available: nativeVideoService.isAvailable(),
      version: nativeVideoService.isAvailable() ? nativeVideoService.getVersion() : 'n/a',
    }
  });
});

app.use('/api', uploadRoutes);
app.use('/api/edit', editRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/thumbnail', thumbnailRoutes);
app.use('/api/metadata', metadataRoutes);

// Prometheus metrics endpoint
app.use('/metrics', metricsRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Initialize services
async function initialize() {
  await storageService.ensureUploadDir();
  console.log('✓ Upload directory initialized');

  // Run database migrations
  try {
    await db.runMigrations();
    console.log('✓ Database migrations completed');
  } catch (error) {
    console.error('⚠ Database migrations failed:', error);
    console.log('  Continuing without database (for development)');
  }
}

initialize().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  wsService.close();
  await db.close();
  await redis.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`VrewCraft Backend running on port ${PORT}`);
  console.log(`Upload directory: ${storageService.getUploadDir()}`);
  console.log(`WebSocket server ready at ws://localhost:${PORT}/ws`);
});
