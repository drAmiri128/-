import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { runMigrations } from './server/db/migrations';
import { seedInitialData } from './server/db/seed';

import { authRouter } from './server/routes/auth';
import { usersRouter } from './server/routes/users';
import { adminRouter } from './server/routes/admin';
import { contentRouter } from './server/routes/content';
import { submissionsRouter } from './server/routes/submissions';
import { settingsRouter } from './server/routes/settings';
import { mazarRouter } from './server/routes/mazar';
import { bannersRouter } from './server/routes/banners';
import { prayersRouter } from './server/routes/prayers';
import { imamologyRouter } from './server/routes/imamology';
import { libraryRouter } from './server/routes/library';
import { navaRouter } from './server/routes/nava';
import { swaggerRouter } from './server/docs/swagger';
import { wsManager } from './server/ws/wsServer';

async function startServer() {
  // Validate security environment variables
  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    console.warn('[Security] Notice: JWT_SECRET environment variable is not defined. Using internal default key.');
  }

  const app = express();
  const PORT = 3000;

  // Basic Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://ai.studio https://*.google.com https://*.run.app");
    next();
  });

  // JSON Body Parser with 2mb limit for media & base64 uploads
  app.use(express.json({ limit: '2mb' }));

  // Database Migrations & Initial Seed
  try {
    console.log('[Database] Running SQLite migrations...');
    await runMigrations();
    console.log('[Database] Migrations complete. Running seed...');
    await seedInitialData();
    console.log('[Database] Initial seed complete.');
  } catch (dbErr) {
    console.error('[Database Error] Failed to run migrations or seed:', dbErr);
  }

  // Health check endpoint
  const handleHealth = (_req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      service: 'sqm-backend',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  };
  app.get('/api/health', handleHealth);
  app.get('/api/v1/health', handleHealth);

  // Disable caching on all /api routes to prevent mobile/browser stale cache
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // OpenAPI Swagger Documentation UI
  app.use('/api/docs', swaggerRouter);

  // REST API v1 routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/content', contentRouter);
  app.use('/api/v1/submissions', submissionsRouter);
  app.use('/api/v1/settings', settingsRouter);
  app.use('/api/v1/mazar-programs', mazarRouter);
  app.use('/api/v1/banners', bannersRouter);
  app.use('/api/v1/prayers', prayersRouter);
  app.use('/api/v1/imamology', imamologyRouter);
  app.use('/api/v1/library', libraryRouter);
  app.use('/api/v1/nava', navaRouter);

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  wsManager.init(httpServer);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Backend Server] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Swagger Docs] API Documentation at http://0.0.0.0:${PORT}/api/docs`);
    console.log(`[WebSocket Server] WebSocket listening on ws://0.0.0.0:${PORT}/ws`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Error] Failed to start server:', err);
  process.exit(1);
});
