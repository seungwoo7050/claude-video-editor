import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import uploadRoutes from './routes/upload.routes.js';
import { StorageService } from './services/storage.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const storageService = new StorageService();

// Middleware
app.use(cors());
app.use(express.json());

// Static file serving for uploaded videos
app.use('/videos', express.static(storageService.getUploadDir()));

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vrewcraft-backend' });
});

app.use('/api', uploadRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Initialize storage
async function initialize() {
  await storageService.ensureUploadDir();
  console.log('Upload directory initialized');
}

initialize().catch(console.error);

app.listen(PORT, () => {
  console.log(`VrewCraft Backend running on port ${PORT}`);
  console.log(`Upload directory: ${storageService.getUploadDir()}`);
});
