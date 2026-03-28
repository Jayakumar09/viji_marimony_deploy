const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Database connection
const { testConnection } = require('./utils/database');

// AI Verification Module
const aiVerification = require('./ai-verification');

const app = express();
const PORT = process.env.PORT || 5001;

// Trust proxy for rate limiter (fixes X-Forwarded-For warning)
app.set('trust proxy', 1);

// CORS configuration - MUST be before other middleware for preflight requests
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'admin-token', 'x-admin-token', 'x-admin-user']
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Rate limiting - after CORS to allow preflight requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  trustProxy: true,
  skipPreflightRequests: true // Skip rate limiting for OPTIONS requests
});
app.use(limiter);

// Body parsing middleware - increased limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (uploaded images) - serve from temp dir if uploads doesn't exist
const uploadsPath = require('path').join(__dirname, 'uploads');
const fs = require('fs');

// Create uploads directory if it doesn't exist (for serving uploaded files)
if (!fs.existsSync(uploadsPath)) {
  try {
    fs.mkdirSync(uploadsPath, { recursive: true });
  } catch (err) {
    console.log('Note: uploads folder not created');
  }
}
app.use('/uploads', express.static(uploadsPath));

// API routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Vijayalakshmi Boyar Matrimony API',
    version: '1.0.0',
    status: 'running',
    database: 'connected'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const searchRoutes = require('./routes/search');
const messageRoutes = require('./routes/message');
const interestRoutes = require('./routes/interest');
const lookupRoutes = require('./routes/lookup');
const verificationRoutes = require('./routes/verification');
const adminRoutes = require('./routes/admin');
const adminFileServeRoutes = require('./routes/adminFileServe');
const adminPhotosRoutes = require('./routes/adminPhotos');
const adminVerificationRoutes = require('./routes/adminVerification');
const paymentRoutes = require('./routes/payments');
const chatRoutes = require('./routes/chat');
const profilePdfRoutes = require('./routes/profilePdf');
const generateSharedProfile = require('./routes/generateSharedProfile');
const testNewPdfRoutes = require('./test-new-pdf');
// const phonepeRoutes = require('./routes/phonepe'); // PhonePe integration not implemented - using manual payments

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/interest', interestRoutes);
app.use('/api/lookup', lookupRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminFileServeRoutes);
app.use('/api/admin', adminPhotosRoutes);
app.use('/api/admin', adminVerificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/profile-pdf', profilePdfRoutes);
app.use('/api/test-new-pdf', testNewPdfRoutes);
app.use('/api/shared-profile', generateSharedProfile);
// app.use('/api/phonepe', phonepeRoutes); // PhonePe integration not implemented - using manual payments

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Terminate any existing process on port 5001
async function terminatePort5001() {
  const { exec } = require('child_process');
  
  return new Promise((resolve, reject) => {
    // Windows: Find and kill process on port 5001
    exec(`netstat -ano | findstr :5001`, (error, stdout, stderr) => {
      if (stdout) {
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[4];
            if (pid && !isNaN(pid) && pid !== '0') {
              pids.add(pid);
            }
          }
        });
        pids.forEach(pid => {
          console.log(`🛑 Terminating process ${pid} on port 5001...`);
          exec(`taskkill /F /PID ${pid}`, (killErr) => {
            // Ignore errors if process already terminated
          });
        });
      }
      // Give more time for the port to be released
      setTimeout(resolve, 1500);
    });
  });
}

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const cloudApiKey = process.env.CLOUDINARY_API_KEY;
const cloudApiSecret = process.env.CLOUDINARY_API_SECRET;

// Check if Cloudinary is properly configured
if (cloudName && cloudApiKey && cloudApiSecret) {
  // Check for common placeholder values
  const isPlaceholder = cloudApiSecret.includes('your_') || 
                       cloudApiSecret.includes('_here') || 
                       cloudApiSecret.length < 10;
  
  if (isPlaceholder) {
    console.log('⚠️  WARNING: Cloudinary API_SECRET appears to be a placeholder. Please update .env with your actual secret.');
    console.log('⚠️  Cloudinary not fully configured. Documents will be stored locally.');
  } else {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: cloudApiKey,
      api_secret: cloudApiSecret,
    });
    console.log(`✅ Cloudinary configured: ${cloudName}`);
  }
} else {
  console.log('⚠️  Cloudinary not configured. Using local file storage for development.');
}

// Start server after database connection
async function startServer() {
  const http = require('http');
  let retries = 0;
  const maxRetries = 5;
  
  async function attemptStart() {
    try {
      // Terminate any existing process on port 5001
      await terminatePort5001();
      
      // Connect to database first
      await testConnection();
      
      // Create HTTP server and try to listen
      const server = http.createServer(app);
      
      server.on('error', async (err) => {
        if (err.code === 'EADDRINUSE' && retries < maxRetries) {
          retries++;
          console.log(`🔄 Port ${PORT} still in use, attempt ${retries}/${maxRetries} to free it...`);
          await terminatePort5001();
          await new Promise(r => setTimeout(r, 1000));
          server.close();
          attemptStart();
        } else {
          console.error(`❌ Failed to start server: ${err.message}`);
          process.exit(1);
        }
      });
      
      server.listen(PORT, async () => {
        console.log(`\n✅ Database: Connected Successfully`);
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📧 Admin contact: vijayalakshmijayakumar45@gmail.com`);
        console.log(`🏠 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
        
        // Initialize AI Verification Services
        try {
          const aiStatus = await aiVerification.initialize();
          if (aiStatus.success) {
            console.log(`🤖 AI Verification: Initialized`);
            console.log(`   - Tesseract OCR: ${aiStatus.services.tesseract}`);
            console.log(`   - AWS Rekognition: ${aiStatus.services.rekognition}`);
          } else {
            console.log(`⚠️  AI Verification: Partial initialization`);
          }
        } catch (aiError) {
          console.log(`⚠️  AI Verification: ${aiError.message}`);
        }
        
        console.log(`\n✅ Frontend can now connect to the backend\n`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  }
  
  attemptStart();
}

// Initialize server
startServer();
