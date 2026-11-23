import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { redisClient } from './config/redis';
import { chromaService } from './config/chroma';

// Routes
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/projects.routes';
import aiAgentRoutes from './routes/ai-agents.routes';
import financialRoutes from './routes/financial.routes';
import builderRoutes from './routes/builder.routes';
import portalRoutes from './routes/portal.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    redis: redisClient.isReady(),
    chroma: chromaService.isReady(),
  });
});

// API Routes
app.use(`/api/${config.apiVersion}/auth`, authRoutes);
app.use(`/api/${config.apiVersion}/projects`, projectRoutes);
app.use(`/api/${config.apiVersion}/ai-agents`, aiAgentRoutes);
app.use(`/api/${config.apiVersion}/portal`, portalRoutes);
app.use(`/api/${config.apiVersion}`, builderRoutes);
app.use(`/api/${config.apiVersion}`, financialRoutes);

// The web app, when FRONTEND_DIST points at a build (Bot HQ serves it under /buildflow/ and strips that prefix).
const frontendDist = process.env.FRONTEND_DIST;
if (frontendDist && fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
async function startServer() {
  try {
    // Connect to Redis
    console.log('Connecting to Redis...');
    await redisClient.connect();

    // Connect to Chroma (optional, will use mock data if unavailable)
    try {
      console.log('Connecting to Chroma...');
      await chromaService.connect();
      await chromaService.initializeCollections();
    } catch (error) {
      console.warn('Chroma connection failed. Running without vector search.');
    }

    // Start HTTP server
    app.listen(config.port, process.env.HOST || '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║   AI-Augmented Construction Management Platform           ║
║                                                            ║
║   Environment: ${config.env.padEnd(42)} ║
║   Server: http://localhost:${config.port.toString().padEnd(34)} ║
║   API Version: ${config.apiVersion.padEnd(40)} ║
║                                                            ║
║   Services:                                                ║
║   - Redis: ${(redisClient.isReady() ? 'Connected ✓' : 'Disconnected ✗').padEnd(45)} ║
║   - Chroma: ${(chromaService.isReady() ? 'Connected ✓' : 'Offline (Mock Mode)').padEnd(44)} ║
║   - AI Agents: 7 agents active ✓                          ║
║                                                            ║
║   Ready to accept connections!                             ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await redisClient.disconnect();
  process.exit(0);
});

// Start the server
startServer();
