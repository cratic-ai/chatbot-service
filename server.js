const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const earlyAccessRoutes = require('./routes/earlyaccessRoutes');
require('dotenv').config();
require('dotenv').config();
console.log('🔍 JWT_SECRET loaded:', process.env.JWT_SECRET ? `YES (${process.env.JWT_SECRET.substring(0, 10)}...)` : 'NO - MISSING!');
const app = express();
const port = 3001;
app.use(cors({
  origin: [
  'https://mfgcompliance.craticai.com',
    'https://mfgcompliance.craticai.com',
     'https://mfgcompliance-cai.vercel.app',
    'http://localhost:5173',
    'https://chatbot-front-lilac.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("🚀 Backend is running on Vercel!");
});
app.use('/client', earlyAccessRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
module.exports = app;

