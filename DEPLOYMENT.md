# Check List App - Netlify Deployment

## 🚀 Quick Deploy

### Option 1: Using the Deploy Script (Recommended)
```bash
./deploy.sh
```

### Option 2: Manual Deployment

1. **Install Netlify CLI** (if not already installed):
   ```bash
   npm install -g netlify-cli
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build for web**:
   ```bash
   npm run build:web
   ```

4. **Deploy to Netlify**:
   ```bash
   netlify deploy --prod --dir=dist
   ```

## 🔧 Configuration Files

- `netlify.toml` - Netlify build configuration
- `app.json` - Expo web configuration (already configured)
- `package.json` - Updated build scripts

## 📁 Build Output

The web build outputs to the `dist/` directory, which is configured in:
- `netlify.toml` (publish directory)
- `package.json` (build script output)

## 🌐 Features Enabled for Web

- Single Page Application (SPA) routing
- Optimized static assets
- Proper caching headers
- Security headers
- Mobile-responsive design

## 📱 Platform Support

This deployment creates a Progressive Web App (PWA) that works on:
- Desktop browsers
- Mobile browsers
- Can be installed as a web app on mobile devices

## 🔍 Environment Variables

If you need to add environment variables for production (like Supabase keys), add them in:
1. Netlify dashboard under Site settings > Environment variables
2. Or use `netlify.toml` for non-sensitive values

## 🐛 Troubleshooting

If the build fails:
1. Check that all dependencies are installed
2. Ensure React Native Web compatibility for all components
3. Verify that Expo web configuration is correct in `app.json`
4. Check console for specific error messages

## 🚀 Continuous Deployment

To set up automatic deployment from GitHub:
1. Connect your GitHub repository to Netlify
2. Netlify will automatically use the `netlify.toml` configuration
3. Every push to main branch will trigger a new deployment
