# SAP BTP Cloud Foundry Deployment Guide

This guide provides instructions for deploying the Checklist Task Manager app to SAP BTP Cloud Foundry.

## Prerequisites

### 1. Install Cloud Foundry CLI
```bash
# macOS
brew install cloudfoundry/tap/cf-cli@8

# Windows
choco install cloudfoundry-cli

# Linux
wget -q -O - https://packages.cloudfoundry.org/debian/cli.cloudfoundry.org.key | sudo apt-key add -
echo "deb https://packages.cloudfoundry.org/debian stable main" | sudo tee /etc/apt/sources.list.d/cloudfoundry-cli.list
sudo apt-get update
sudo apt-get install cf8-cli
```

### 2. Install MTA Build Tool (Optional but Recommended)
```bash
npm install -g mbt
```

### 3. SAP BTP Account
- Active SAP BTP account with Cloud Foundry space
- Necessary service entitlements:
  - HTML5 Application Repository
  - Destination Service
  - Authorization & Trust Management (XSUAA)

## Configuration Files

The following Cloud Foundry configuration files have been created:

### 1. `mta.yaml`
Multi-Target Application descriptor for MTA-based deployment. Includes:
- HTML5 module configuration
- Service dependencies (Destination, HTML5 Repo, XSUAA)
- Build parameters

### 2. `manifest.yml`
Standard Cloud Foundry manifest for simple deployments without MTA.

### 3. `xs-app.json`
Application router configuration for routing and authentication.

### 4. `Staticfile`
Configuration for the staticfile buildpack with SPA routing support.

## Deployment Methods

### Method 1: Quick Deploy (Recommended for Development)

1. **Login to Cloud Foundry**
```bash
cf login -a https://api.cf.{region}.hana.ondemand.com
```

2. **Build and Deploy**
```bash
npm run deploy:cf
```

This script will:
- Install dependencies
- Build the web application
- Deploy to Cloud Foundry using either MTA or standard cf push

### Method 2: MTA Deployment (Recommended for Production)

1. **Login to Cloud Foundry**
```bash
cf login -a https://api.cf.{region}.hana.ondemand.com
```

2. **Build MTA Archive**
```bash
npm run build:mta
```

3. **Deploy MTA**
```bash
npm run deploy:mta
```

Or use the combined command:
```bash
cf deploy mta_archives/*.mtar
```

### Method 3: Standard cf push

1. **Build the application**
```bash
npm install --legacy-peer-deps
npm run build:web
```

2. **Deploy**
```bash
cf push
```

## Environment Variables

Create a `.env` file in the root directory with your configuration:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
EXPO_PUBLIC_APP_ENV=production
```

**Important:** Never commit `.env` files to version control.

## Post-Deployment

### 1. Verify Deployment
```bash
cf apps
```

### 2. View Logs
```bash
cf logs checklist-app --recent
```

### 3. Access Your App
Your app will be available at:
```
https://checklist-app-{space}.cfapps.{region}.hana.ondemand.com
```

### 4. Bind Custom Domain (Optional)
```bash
cf map-route checklist-app {your-domain} --hostname {subdomain}
```

## Service Configuration

### Create Services Manually (if not using MTA)

```bash
# Create HTML5 Application Repository
cf create-service html5-apps-repo app-runtime checklist-app-html5-repo-runtime
cf create-service html5-apps-repo app-host checklist-app-html5-repo-host

# Create Destination Service
cf create-service destination lite checklist-app-destination

# Create XSUAA Service
cf create-service xsuaa application checklist-uaa -c xsuaa-config.json
```

### Bind Services to Application
```bash
cf bind-service checklist-app checklist-app-html5-repo-runtime
cf bind-service checklist-app checklist-app-destination
cf bind-service checklist-app checklist-uaa
cf restage checklist-app
```

## Updating the Application

### Update with MTA
```bash
npm run build:mta
npm run deploy:mta
```

### Update with cf push
```bash
npm run build:web
cf push
```

## Scaling

### Scale Instances
```bash
cf scale checklist-app -i 2
```

### Scale Memory
```bash
cf scale checklist-app -m 512M
```

## Troubleshooting

### View Application Logs
```bash
cf logs checklist-app --recent
```

### SSH into Application Container
```bash
cf ssh checklist-app
```

### Check Application Events
```bash
cf events checklist-app
```

### Restart Application
```bash
cf restart checklist-app
```

### Common Issues

**Issue: Build fails with memory error**
Solution: Increase disk quota in `manifest.yml` or `mta.yaml`

**Issue: Routes not working (404 errors)**
Solution: Ensure `pushstate: enabled` in Staticfile and check xs-app.json routes

**Issue: Environment variables not loaded**
Solution: Set variables using `cf set-env` command:
```bash
cf set-env checklist-app EXPO_PUBLIC_SUPABASE_URL "your_url"
cf restage checklist-app
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to SAP BTP CF

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install CF CLI
        run: |
          wget -q -O - https://packages.cloudfoundry.org/debian/cli.cloudfoundry.org.key | sudo apt-key add -
          echo "deb https://packages.cloudfoundry.org/debian stable main" | sudo tee /etc/apt/sources.list.d/cloudfoundry-cli.list
          sudo apt-get update
          sudo apt-get install cf8-cli
      
      - name: Deploy to Cloud Foundry
        env:
          CF_API: ${{ secrets.CF_API }}
          CF_USERNAME: ${{ secrets.CF_USERNAME }}
          CF_PASSWORD: ${{ secrets.CF_PASSWORD }}
          CF_ORG: ${{ secrets.CF_ORG }}
          CF_SPACE: ${{ secrets.CF_SPACE }}
        run: |
          cf login -a $CF_API -u $CF_USERNAME -p $CF_PASSWORD -o $CF_ORG -s $CF_SPACE
          npm install --legacy-peer-deps
          npm run build:web
          cf push
```

## Security Considerations

1. **HTTPS Only**: The app is configured to force HTTPS via `FORCE_HTTPS: true`
2. **Authentication**: XSUAA service provides authentication
3. **Headers**: Security headers configured in xs-app.json
4. **Secrets**: Use CF user-provided services or environment variables for sensitive data

## Additional Resources

- [SAP BTP Cloud Foundry Documentation](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/9c7092c7b7ae4d49bc8ae35fdd0e0b18.html)
- [Cloud Foundry CLI Reference](https://cli.cloudfoundry.org/en-US/v8/)
- [MTA Build Tool](https://sap.github.io/cloud-mta-build-tool/)
- [HTML5 Application Repository](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/11d77aa154f64c2e83cc9652a78bb985.html)

## Support

For issues related to:
- **SAP BTP**: Contact SAP Support or check SAP Community
- **Application Code**: Create an issue in the repository
- **Cloud Foundry**: Check Cloud Foundry documentation or community forums
