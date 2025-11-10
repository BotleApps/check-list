const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cfenv = require('cfenv');
const { OAuth2Client } = require('google-auth-library');
const { initializeDatabase } = require('./db-init');

const db = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bucketRoutes = require('./routes/buckets');
const tagRoutes = require('./routes/tags');
const categoryRoutes = require('./routes/categories');
const checklistRoutes = require('./routes/checklists');
const templateRoutes = require('./routes/templates');

const app = express();
const appEnv = cfenv.getAppEnv();

// Google OAuth Client
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Google OAuth Token Verification Middleware (only for API routes)
const verifyGoogleToken = async (req, res, next) => {
  // Skip auth for health check and auth endpoints
  if (req.path === '/health' || req.path.startsWith('/api/auth')) {
    return next();
  }

  // Only apply authentication to /api/* routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.substring(7);
  
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    // Attach user info to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

app.use(verifyGoogleToken);

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/buckets', bucketRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/templates', templateRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const PORT = process.env.PORT || appEnv.port || 3000;
app.listen(PORT, async () => {
  console.log(`✅ Checklist Backend API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test database connection
  db.query('SELECT NOW()', async (err, result) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
    } else {
      console.log('✅ Database connected successfully at', result.rows[0].now);
      
      // Initialize database schema on first startup
      try {
        await initializeDatabase();
      } catch (error) {
        console.error('⚠️  Database initialization failed, but server will continue:', error.message);
      }
    }
  });
});

module.exports = app;
