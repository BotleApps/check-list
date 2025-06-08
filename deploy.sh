#!/bin/bash

# Check List App - Netlify Deployment Script

echo "🚀 Starting Netlify deployment process..."

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build the web version
echo "🔨 Building web version..."
npm run build:web

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Build successful! Output directory: dist"
    
    # Deploy to Netlify
    echo "🌐 Deploying to Netlify..."
    netlify deploy --prod --dir=dist
    
    echo "🎉 Deployment complete!"
else
    echo "❌ Build failed! Please check the build output for errors."
    exit 1
fi
