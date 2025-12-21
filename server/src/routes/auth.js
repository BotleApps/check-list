/**
 * Authentication Routes
 * 
 * Handles Google OAuth login/logout and session management
 */

const express = require('express');
const passport = require('passport');
const { generateToken, setTokenCookie, clearTokenCookie, isAuthenticated } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow
 */
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
}));

/**
 * GET /api/auth/google/callback
 * Google OAuth callback handler
 */
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${process.env.CLIENT_URL}/login?error=auth_failed`,
        session: false,
    }),
    (req, res) => {
        try {
            // Generate JWT token
            const token = generateToken(req.user);

            // Set token in HTTP-only cookie
            setTokenCookie(res, token);

            // Redirect to frontend
            const redirectUrl = process.env.CLIENT_URL || 'http://localhost:8081';
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('OAuth callback error:', error);
            res.redirect(`${process.env.CLIENT_URL}/login?error=token_generation_failed`);
        }
    }
);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', isAuthenticated, (req, res) => {
    res.json({
        user: {
            user_id: req.user._id,
            email: req.user.email,
            name: req.user.name,
            picture: req.user.picture,
            settings: req.user.settings,
        },
    });
});

/**
 * GET /api/auth/status
 * Check authentication status (doesn't require auth)
 */
router.get('/status', async (req, res) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.json({ isAuthenticated: false });
    }

    try {
        const jwt = require('jsonwebtoken');
        const User = require('../models/User');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            clearTokenCookie(res);
            return res.json({ isAuthenticated: false });
        }

        res.json({
            isAuthenticated: true,
            user: {
                user_id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
        });
    } catch (error) {
        clearTokenCookie(res);
        res.json({ isAuthenticated: false });
    }
});

/**
 * POST /api/auth/logout
 * Logout user and clear session
 */
router.post('/logout', (req, res) => {
    clearTokenCookie(res);

    req.logout?.((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
    });

    res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * POST /api/auth/google (for mobile apps and web)
 * Validate Google token and create session
 */
router.post('/google', async (req, res) => {
    const { token } = req.body;

    console.log('📥 POST /api/auth/google received');
    console.log('Token received:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

    if (!token) {
        console.log('❌ No token provided');
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        // Verify token with Google
        console.log('🔍 Verifying token with Google...');
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
        });

        console.log('Google response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Google API error:', errorText);
            throw new Error(`Google API returned ${response.status}: ${errorText}`);
        }

        const profile = await response.json();
        console.log('✅ Google profile received:', profile.email);

        // Find or create user
        const User = require('../models/User');
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            console.log('👤 Existing user found:', user.email);
            user.lastLogin = new Date();
            user.picture = profile.picture || user.picture;
            await user.save();
        } else {
            console.log('🆕 Creating new user:', profile.email);
            user = await User.create({
                googleId: profile.id,
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
            });
        }

        // Generate JWT and set cookie
        const jwtToken = generateToken(user);
        setTokenCookie(res, jwtToken);

        console.log('✅ Authentication successful for:', user.email);

        res.json({
            success: true,
            user: {
                user_id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
        });
    } catch (error) {
        console.error('❌ Google token validation error:', error.message);
        console.error('Full error:', error);
        res.status(401).json({ error: 'Invalid token', details: error.message });
    }
});

module.exports = router;
