import express from 'express';
import cors from 'cors';
import { authRoutes } from './routes/auth';
import { profileRoutes } from './routes/profile';
import { communityRoutes } from './routes/communities';
import { postRoutes } from './routes/posts';
import { authGeneralLimiter } from './middleware/rateLimit';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN ?? true;
app.use(
  cors({
    origin: corsOrigin === true ? true : corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authGeneralLimiter, authRoutes);
app.use('/profile', profileRoutes);
app.use('/communities', communityRoutes);
app.use('/posts', postRoutes);

export default app;
