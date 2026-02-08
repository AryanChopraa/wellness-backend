import express from 'express';
import { authRoutes } from './routes/auth';
import { profileRoutes } from './routes/profile';
import { authGeneralLimiter } from './middleware/rateLimit';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authGeneralLimiter, authRoutes);
app.use('/profile', profileRoutes);

export default app;
