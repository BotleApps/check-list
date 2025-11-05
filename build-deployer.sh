#!/bin/bash

# Build script for HTML5 deployer module
echo "Building web application..."
npm install --legacy-peer-deps
npm run build:web

echo "Creating manifest.json..."
echo '{"sap.app":{"id":"checklistapp","type":"application","applicationVersion":{"version":"1.0.0"},"title":"Checklist Task Manager","description":"Task management application"},"sap.cloud":{"service":"checklist-app"}}' > dist/manifest.json

echo "Creating checklistapp.zip..."
cd dist && zip -r ../deployer/checklistapp.zip * && cd ..

echo "Verifying deployer contents..."
ls -lh deployer/

echo "✅ Deployer build completed"
