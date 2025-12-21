/**
 * Checklist API Server - Vercel Deployment
 * 
 * Express.js backend with MongoDB, Passport.js Google OAuth, and JWT authentication
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import configurations
const configurePassport = require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();

// MongoDB Connection with serverless optimizations
// Cache the connection across serverless invocations
let cachedDb = null;

const connectDB = async () => {
    if (cachedDb && mongoose.connection.readyState === 1) {
        console.log('✅ Using cached MongoDB connection');
        return cachedDb;
    }

    if (mongoose.connection.readyState === 2) {
        // Connection is being established, wait for it
        console.log('⏳ MongoDB connection in progress, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return connectDB();
    }

    try {
        console.log('🔗 Connecting to MongoDB...');
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000, // Increased timeout for cold starts
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 1,
            connectTimeoutMS: 30000,
            bufferCommands: true, // Buffer commands until connected
        });

        cachedDb = conn;
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        cachedDb = null;
        throw error;
    }
};

// Middleware to ensure DB is connected before handling requests
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        res.status(503).json({ error: 'Database connection failed. Please try again.' });
    }
});

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
    cachedDb = null;
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
    cachedDb = null;
});

// Security middleware
app.use(helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.CLIENT_URL,
            'http://localhost:8081',
            'http://localhost:19006',
            'http://localhost:3000',
        ].filter(Boolean);

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(null, true); // Allow in development, restrict in production
        }
    },
    credentials: true, // IMPORTANT: Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration (for OAuth flow)
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
}));

// Initialize Passport
configurePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server (only for local development, Vercel handles this in production)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
        console.log(`🚀 Checklist API running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

// Export for Vercel serverless
module.exports = app;
