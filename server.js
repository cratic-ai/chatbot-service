const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const earlyAccessRoutes = require('./routes/earlyaccessRoutes');
const { apiLimiter } = require('./utils/rateLimiter');
require('dotenv').config();

console.log('🔍 JWT_SECRET loaded:', process.env.JWT_SECRET ? `YES (${process.env.JWT_SECRET.substring(0, 10)}...)` : 'NO - MISSING!');

const app = express();
const port = 3001;

// ============================================
// CORS Configuration
// ============================================
app.use(cors({
  origin: [
    'https://mfgcompliance.craticai.com',
    'https://mfgcompliance-cai.vercel.app',
    'http://localhost:5173',
    'https://chatbot-front-lilac.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================
// Body Parser
// ============================================
app.use(express.json({ limit: '10mb' })); // Increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// OPTIMIZATION: Rate Limiting
// Apply to all API routes to prevent abuse
// ============================================
app.use('/api/', apiLimiter);

// ============================================
// Health Check
// ============================================
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "🚀 Backend is running on Vercel!",
    timestamp: new Date().toISOString()
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

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ============================================
// Start Server (only in development)
// ============================================
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`✅ Server is running on http://localhost:${port}`);
  });
}


module.exports = app;


