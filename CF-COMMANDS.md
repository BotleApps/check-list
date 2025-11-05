# SAP BTP Cloud Foundry - Quick Reference Commands

## Initial Setup
```bash
# 1. Install CF CLI
brew install cloudfoundry/tap/cf-cli@8  # macOS

# 2. Install MTA Build Tool (optional)
npm install -g mbt

# 3. Login to Cloud Foundry
cf login -a https://api.cf.{region}.hana.ondemand.com
```

## Deploy Commands

### Quick Deploy (Automated Script)
```bash
npm run deploy:cf
```

### MTA Deployment
```bash
# Build and deploy in one command
npm run deploy:mta

# Or step by step:
npm run build:mta
cf deploy mta_archives/*.mtar
```

### Standard Deployment
```bash
npm run build:web
cf push
```

## Useful CF Commands

### Application Management
```bash
cf apps                          # List all apps
cf app checklist-app             # Show app details
cf logs checklist-app --recent   # View logs
cf restart checklist-app         # Restart app
cf restage checklist-app         # Restage app
cf delete checklist-app          # Delete app
```

### Scaling
```bash
cf scale checklist-app -i 2      # Scale to 2 instances
cf scale checklist-app -m 512M   # Scale memory to 512MB
```

### Environment Variables
```bash
cf env checklist-app                                    # View all env vars
cf set-env checklist-app KEY "value"                    # Set env var
cf unset-env checklist-app KEY                          # Unset env var
```

### Services
```bash
cf services                                            # List services
cf create-service SERVICE PLAN NAME                    # Create service
cf bind-service checklist-app SERVICE                  # Bind service
cf unbind-service checklist-app SERVICE                # Unbind service
```

### Routes
```bash
cf routes                                              # List routes
cf map-route checklist-app DOMAIN --hostname HOST      # Map route
cf unmap-route checklist-app DOMAIN --hostname HOST    # Unmap route
```

### Troubleshooting
```bash
cf ssh checklist-app                   # SSH into container
cf events checklist-app                # View events
cf get-health-check checklist-app      # Check health status
```

## Production Deployment Checklist

- [ ] Update version in package.json
- [ ] Test build locally: `npm run build:web`
- [ ] Review environment variables
- [ ] Login to production space: `cf login`
- [ ] Deploy: `npm run deploy:cf`
- [ ] Verify deployment: `cf app checklist-app`
- [ ] Test application in browser
- [ ] Monitor logs: `cf logs checklist-app`
- [ ] Update DNS/routes if needed

## Rollback

```bash
# If using Blue-Green deployment
cf bg-restage checklist-app

# If standard deployment, redeploy previous version
cf push -p path/to/previous/dist
```
