// src/dashboard/server.js — Express + Socket.IO server
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server: SocketServer } = require('socket.io');
const authRouter = require('./auth');
const { createApiRouter } = require('./api');
const { setupSocket } = require('./socket');
const { DashboardBridge } = require('./bridge');

function startDashboard(client) {
  // Support DASHBOARD_PORT, Pterodactyl SERVER_PORT / PORT, or default to 25634 (VisiHost allocated port)
  const PORT = parseInt(process.env.DASHBOARD_PORT || process.env.PORT || process.env.SERVER_PORT, 10) || 25634;
  const app = express();
  const server = http.createServer(app);

  // Trust proxy for Vercel/Pterodactyl reverse proxy (needed for secure cookies & client IP)
  app.set('trust proxy', true);

  // Clean dashboard URL without trailing slash
  const cleanDashboardUrl = (process.env.DASHBOARD_URL || 'https://uraniumbot.vercel.app').replace(/\/+$/, '');

  // Session middleware
  const sessionOptions = {
    secret: process.env.SESSION_SECRET || 'uranium-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      // 'auto' detects HTTPS from trust proxy (x-forwarded-proto from Vercel)
      secure: process.env.COOKIE_SECURE ? (process.env.COOKIE_SECURE === 'true') : (cleanDashboardUrl.startsWith('https') || process.env.NODE_ENV === 'production' ? 'auto' : false),
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  };

  if (process.env.MONGODB_URI) {
    try {
      sessionOptions.store = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'dashboard_sessions',
        ttl: 7 * 24 * 60 * 60 // 7 days
      });
    } catch (storeErr) {
      console.warn('[Dashboard] Could not initialize MongoStore for sessions, using MemoryStore:', storeErr.message);
    }
  }

  const sessionMiddleware = session(sessionOptions);

  // Middleware
  // In production with Vercel Rewrites, the origin will be the Vercel URL
  const allowedOrigins = [
    cleanDashboardUrl,
    `${cleanDashboardUrl}/`,
    'https://uraniumbot.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow if no origin (local tools, server-to-server) or in allowed list/Vercel
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('visihost.in') ||
        process.env.NODE_ENV !== 'production'
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true
  }));
  app.use(express.json());
  app.use(sessionMiddleware);

  // Static files — Now pointing to Next.js build
  // With trailingSlash: true, Next.js generates /servers/index.html etc.
  app.use(express.static(path.join(__dirname, 'frontend', 'out'), {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));
 
  // Routes
  app.use('/auth', authRouter);
  app.use('/api', createApiRouter(client));
 
  // SPA fallback — serve index.html for non-file routes from Next.js build
  // Using app.use at the end to avoid Express 5 wildcard syntax issues
  app.use((req, res, next) => {
    // Skip if it's an API/Auth route
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
    
    // If it's a file request (has an extension), it probably should have been caught by express.static
    if (path.extname(req.path)) return res.status(404).send('Not found');

    // Try to find the file in the out directory (e.g. /servers -> /servers/index.html)
    const filePath = req.path.endsWith('/') ? req.path + 'index.html' : req.path + '/index.html';
    const absolutePath = path.join(__dirname, 'frontend', 'out', filePath);
    
    res.sendFile(absolutePath, (err) => {
      if (err) {
        // Final fallback to root index.html
        res.sendFile(path.join(__dirname, 'frontend', 'out', 'index.html'));
      }
    });
  });

  // API 404 handler — always return JSON, NEVER HTML
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // Global error handler for API and Auth
  app.use((err, req, res, next) => {
    if (req.path && (req.path.startsWith('/api') || req.path.startsWith('/auth'))) {
      console.error('[API Error]', err);
      return res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
    }
    next(err);
  });

  // Socket.IO
  const io = new SocketServer(server, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      credentials: true
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    pingTimeout: 30000,
    pingInterval: 25000
  });

  // Setup socket event handlers
  setupSocket(io, client);

  // Setup bridge (hooks into Kazagumo events)
  const bridge = new DashboardBridge(client, io);
  client.dashboardBridge = bridge;
  client.dashboardIO = io;

  // Start server
  const HOST = process.env.DASHBOARD_HOST || '0.0.0.0';
  server.listen(PORT, HOST, () => {
    console.log(`🌐 Dashboard backend running at http://${HOST}:${PORT}`);
    console.log(`📡 Vercel Proxy Destination configured to: http://noida.visihost.in:${PORT}`);
  });

  return { app, server, io, bridge };
}

module.exports = { startDashboard };
