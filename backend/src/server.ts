import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vrewcraft-backend' });
});

app.listen(PORT, () => {
  console.log(`VrewCraft Backend running on port ${PORT}`);
});
