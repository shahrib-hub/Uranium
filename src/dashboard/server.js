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
  const PORT = parseInt(process.env.DASHBOARD_PORT) || 3000;
  const app = express();
  const server = http.createServer(app);

  // Trust proxy for Vercel/Reverse Proxy (needed for secure cookies)
  app.set('trust proxy', 1);

  // Session middleware
  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'uranium-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'dashboard_sessions',
      ttl: 7 * 24 * 60 * 60 // 7 days
    }),
    cookie: {
      // Secure if HTTPS or in production
      secure: process.env.DASHBOARD_URL?.startsWith('https') || process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  });

  // Middleware
  // In production with Vercel Rewrites, the origin will be the Vercel URL
  const allowedOrigins = [
    process.env.DASHBOARD_URL,
    'http://localhost:3000',
    'http://localhost:3001'
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow if no origin (local tools) or if it's in our allowed list
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Fallback to true but log warning (optional)
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
      origin: allowedOrigins,
      credentials: true
    }
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
    console.log(`🌐 Dashboard running at http://${HOST}:${PORT}`);
  });

  return { app, server, io, bridge };
}

module.exports = { startDashboard };
