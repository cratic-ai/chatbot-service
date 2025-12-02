// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const earlyAccessRoutes = require('./routes/earlyaccessRoutes');
const healthRoutes = require('./routes/health');
const { apiLimiter } = require('./utils/ratelimiter');
const socketManager = require('./socket/socketDocument');
const uploadQueue = require('./queue/uploadQueue');
require('dotenv').config();


if (uploadQueue) {
   require('./workers/uploadworkers');
    console.log('✅ Upload worker loaded and ready');
} else {
    console.warn('⚠️  Upload worker not loaded - Queue not available');
    console.warn('⚠️  Uploads will be processed synchronously');
}
// Import worker to start processing jobs


console.log('🔍 JWT_SECRET loaded:', process.env.JWT_SECRET ? `YES (${process.env.JWT_SECRET.substring(0, 10)}...)` : 'NO - MISSING!');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);
// ============================================
// CORS Configuration
// ============================================
const allowedOrigins = [
  'https://mfgcompliance-cai.vercel.app',
  'https://mfgcompliance.craticai.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chatbot-front-lilac.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

// CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
}));

// Explicit preflight handling
app.options('*', cors());

// Add to your server.js BEFORE routes
app.use((req, res, next) => {
    const origin = req.headers.origin;

    console.log('📍 Incoming request:', {
        method: req.method,
        path: req.path,
        origin: origin,
        headers: req.headers
    });

    // Force CORS headers
    res.setHeader('Access-Control-Allow-Origin', origin || 'https://mfgcompliance-cai.vercel.app');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Log response headers
    const originalSend = res.send;
    res.send = function(data) {
        console.log('📤 Response headers:', res.getHeaders());
        originalSend.call(this, data);
    };

    if (req.method === 'OPTIONS') {
        console.log('✅ Handling OPTIONS preflight');
        return res.status(200).end();
    }

    next();
});
// Manual CORS headers as fallback (important for Vercel)
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});
const port = process.env.PORT || 3001;

// ============================================
// MongoDB Connection
// ============================================
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {

  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    // Don't exit in production, continue without DB features
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  // MongoDB connection event handlers
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });
} else {
  console.warn('⚠️  MONGODB_URI not set - database features disabled');
}

// ============================================
// Initialize WebSocket (only if Redis is available)
// ============================================
if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    socketManager.initialize(server);
    console.log('✅ WebSocket initialized');
  } catch (error) {
    console.error('❌ WebSocket initialization failed:', error);
    console.warn('⚠️  Real-time updates will not be available');
  }
} else {
  console.warn('⚠️  Redis not configured - WebSocket features disabled');
}

// ============================================
// CORS Configuration
// ============================================


// ============================================
// Body Parser
// ============================================
app.use(express.json({ limit: process.env.MAX_UPLOAD_SIZE || '50mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_UPLOAD_SIZE || '50mb' }));

// ============================================
// Request Logging Middleware (Development)
// ============================================
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// Rate Limiting (only for API routes)
// ============================================
app.use('/api/', apiLimiter);

// ============================================
// Health Check & Metrics
// ============================================
app.use('/health', healthRoutes);

// Basic health endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "🚀 Backend is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      database: mongoose.connection.readyState === 1,
      websocket: socketManager.getIO() !== null,
      queue: !!process.env.REDIS_URL || !!process.env.REDIS_HOST
    }
  });
});

// ============================================
// Routes
// ============================================
app.use('/client', earlyAccessRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/gemini', require('./routes/chatgeminiRoutes'));

// ============================================
// Error Handler Middleware
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  // Don't expose internal errors in production
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// ============================================
// Graceful Shutdown Handler
// ============================================
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received - shutting down gracefully...`);

  try {
    // Stop accepting new requests
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Close queue
    if (uploadQueue) {
      await uploadQueue.close();
      console.log('✅ Queue closed');
    }

    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✅ Database connection closed');
    }

    // Close cache/Redis connections
    const cacheManager = require('./utils/CacheManager');
    if (cacheManager && cacheManager.close) {
      await cacheManager.close();
      console.log('✅ Cache connection closed');
    }

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});


if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(port, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Server Status');
    console.log('='.repeat(50));
    console.log(`✅ Server running on port ${port}`);
    console.log(`📊 Metrics: http://localhost:${port}/health/metrics`);
    console.log(`🏥 Health: http://localhost:${port}/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(50) + '\n');
  });
}

module.exports = app;

//TLDUeNlVqzEBavJY
