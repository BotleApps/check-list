#!/bin/bash

# SAP BTP Cloud Foundry Deployment Script
# This script builds and deploys the Checklist app to SAP BTP Cloud Foundry

set -e

echo "🚀 Starting SAP BTP Cloud Foundry Deployment..."

# Parse command line arguments
CLEAN_DEPLOY=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --clean) CLEAN_DEPLOY=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Check if cf CLI is installed
if ! command -v cf &> /dev/null; then
    echo "❌ Cloud Foundry CLI not found. Please install it first:"
    echo "   https://docs.cloudfoundry.org/cf-cli/install-go-cli.html"
    exit 1
fi

# Check if MTA Build Tool is installed (optional but recommended)
if command -v mbt &> /dev/null; then
    echo "✅ MTA Build Tool found"
    USE_MTA=true
else
    echo "⚠️  MTA Build Tool not found. Using standard cf push."
    echo "   To use MTA deployment, install: npm install -g mbt"
    USE_MTA=false
fi

# Build the application
echo "📦 Building the application..."
npm install --legacy-peer-deps
npm run build:web

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed. dist directory not found."
    exit 1
fi

echo "✅ Build completed successfully"

# Clean up previous deployment if requested
if [ "$CLEAN_DEPLOY" = true ]; then
    echo "🧹 Cleaning up previous deployment..."
    
    # Delete failed services
    echo "Deleting services (if they exist)..."
    cf delete-service checklist-uaa -f 2>/dev/null || echo "Service checklist-uaa not found or already deleted"
    cf delete-service checklist-app-destination -f 2>/dev/null || echo "Service checklist-app-destination not found"
    cf delete-service checklist-app-html5-repo-runtime -f 2>/dev/null || echo "Service checklist-app-html5-repo-runtime not found"
    cf delete-service checklist-app-html5-repo-host -f 2>/dev/null || echo "Service checklist-app-html5-repo-host not found"
    
    # Wait for services to be deleted
    echo "Waiting for services to be deleted (30 seconds)..."
    sleep 30
fi

# Deploy based on available tools
if [ "$USE_MTA" = true ]; then
    echo "📤 Building MTA archive..."
    mbt build
    
    echo "🚀 Deploying MTA to Cloud Foundry..."
    cf deploy mta_archives/*.mtar
else
    echo "🚀 Deploying to Cloud Foundry using manifest.yml..."
    cf push
fi

echo "✨ Deployment completed successfully!"
echo "📱 Your app should now be available at the route specified in manifest.yml"
