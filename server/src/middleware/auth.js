/**
 * Authentication Middleware
 * 
 * JWT verification and token generation utilities
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret-for-dev';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate a JWT token for a user
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user._id,
            email: user.email,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

/**
 * Set JWT token as HTTP-only cookie
 */
const setTokenCookie = (res, token) => {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
    });
};

/**
 * Clear authentication cookie
 */
const clearTokenCookie = (res) => {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    });
};

/**
 * Middleware to verify JWT from cookie
 */
const isAuthenticated = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({
            error: 'Not authenticated',
            message: 'Please log in to access this resource',
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Fetch user from database
        const user = await User.findById(decoded.userId);

        if (!user) {
            clearTokenCookie(res);
            return res.status(401).json({
                error: 'User not found',
                message: 'Please log in again',
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('JWT verification error:', error.message);
        clearTokenCookie(res);
        return res.status(401).json({
            error: 'Invalid token',
            message: 'Please log in again',
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (user) {
            req.user = user;
        }
    } catch (error) {
        // Silently ignore invalid tokens for optional auth
    }

    next();
};

module.exports = {
    generateToken,
    setTokenCookie,
    clearTokenCookie,
    isAuthenticated,
    optionalAuth,
};
