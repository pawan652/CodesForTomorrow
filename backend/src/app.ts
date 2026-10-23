import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { requireAuth } from './middleware/requireAuth';
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import userRoutes from './routes/userRoutes';
import usersRoutes from './routes/usersRoutes';

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === clientOrigin || /^https?:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed'));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/auth', authRoutes);
app.use('/chat', requireAuth, chatRoutes);
app.use('/user', requireAuth, userRoutes);
app.use('/users', requireAuth, usersRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
