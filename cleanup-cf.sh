#!/bin/bash

# Cleanup failed Cloud Foundry deployment

set -e

echo "🧹 Cleaning up Cloud Foundry deployment..."

# Delete services
echo "Deleting services..."
cf delete-service checklist-uaa -f 2>/dev/null || echo "✓ Service checklist-uaa not found"
cf delete-service checklist-app-destination -f 2>/dev/null || echo "✓ Service checklist-app-destination not found"
cf delete-service checklist-app-html5-repo-runtime -f 2>/dev/null || echo "✓ Service checklist-app-html5-repo-runtime not found"
cf delete-service checklist-app-html5-repo-host -f 2>/dev/null || echo "✓ Service checklist-app-html5-repo-host not found"

# Delete app
echo "Deleting application..."
cf delete checklist-app-web -f 2>/dev/null || echo "✓ App checklist-app-web not found"
cf delete checklist-app -f 2>/dev/null || echo "✓ App checklist-app not found"

echo "✅ Cleanup completed!"
echo ""
echo "You can now redeploy with: npm run deploy:cf"
