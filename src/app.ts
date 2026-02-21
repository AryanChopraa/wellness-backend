import express from 'express';
import cors from 'cors';
import { authRoutes } from './routes/auth';
import { profileRoutes } from './routes/profile';
import { communityRoutes } from './routes/communities';
import { postRoutes } from './routes/posts';
import { productRoutes } from './routes/products';
import { chatRoutes } from './routes/chat';
import { assessmentRoutes } from './routes/assessment';
import { progressRoutes } from './routes/progress';
import { exerciseRoutes } from './routes/exercises';
import { videoRoutes } from './routes/videos';
import { assetsRoutes } from './routes/assets';
import { authGeneralLimiter } from './middleware/rateLimit';
import { setBlockedFlag, wrapResponse } from './middleware/responseWrapper';

const app = express();
app.set('trust proxy', 2);                                                                         

const corsOrigin = process.env.CORS_ORIGIN ?? true;
app.use(
  cors({
    origin: corsOrigin === true ? true : corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

app.use(express.json());

app.use(setBlockedFlag);
app.use(wrapResponse);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), message: 'OK' });
});

app.use('/auth', authGeneralLimiter, authRoutes);
app.use('/profile', profileRoutes);
app.use('/communities', communityRoutes);
app.use('/posts', postRoutes);
app.use('/products', productRoutes);
app.use('/chat', chatRoutes);
app.use('/assessment', assessmentRoutes);
app.use('/progress', progressRoutes);
app.use('/exercises', exerciseRoutes);
app.use('/videos', videoRoutes);
app.use('/assets', assetsRoutes);

export default app;
