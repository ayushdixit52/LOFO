import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import reportRoutes from './routes/reportRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// CORS configuration supporting frontend integration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, postman) or matching CLIENT_ORIGIN
      if (!origin || origin === CLIENT_ORIGIN || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive during hackathon local testing
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded static images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes per docs/API_CONTRACT.md
app.use('/api', healthRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);

// Fallback 404 handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

// Start server function
export async function startServer() {
  try {
    await connectDB();
  } catch (err) {
    console.warn(`[Server] Starting in offline/fallback mode (database connection failed: ${err.message})`);
  }

  const server = app.listen(PORT, () => {
    console.log(`[Server] Project BLUE backend running at http://localhost:${PORT}`);
    console.log(`[Server] API endpoints available at http://localhost:${PORT}/api`);
  });

  return { app, server };
}

// Auto-run if executed directly as entrypoint
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
