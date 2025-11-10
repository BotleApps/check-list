# Complete Migration Guide: Supabase to SAP BTP

## Overview
This guide provides step-by-step instructions to migrate the Checklist application from Supabase to SAP BTP with social authentication via IAS.

## Architecture Changes

### Before (Supabase)
- **Auth**: Supabase Auth with Google OAuth
- **Database**: Supabase PostgreSQL with RLS
- **API**: Direct Supabase client calls from frontend
- **Deployment**: Netlify (frontend)

### After (SAP BTP)
- **Auth**: SAP IAS with Google/Facebook social login
- **Database**: SAP BTP PostgreSQL (Hyperscaler)
- **API**: Node.js/Express backend on CF
- **Deployment**: Cloud Foundry (full stack)

## Migration Steps

### Phase 1: Setup IAS Social Login
📄 **Follow**: `IAS-SOCIAL-LOGIN-SETUP.md`

**Key Tasks:**
1. Configure Google OAuth credentials
2. Add Google as identity provider in IAS
3. Create application in IAS
4. Configure trust between IAS and XSUAA
5. Test social login flow

**Verification:**
```bash
# Access your app and verify Google login button appears
open https://[your-cf-app].cfapps.eu12.hana.ondemand.com
```

### Phase 2: Provision PostgreSQL Database
📄 **Follow**: `BTP-POSTGRES-SETUP.md`

**Key Tasks:**
1. Create PostgreSQL service instance
   ```bash
   cf create-service postgresql-db small checklist-postgres-db
   ```

2. Create service key
   ```bash
   cf create-service-key checklist-postgres-db checklist-postgres-key
   ```

3. Get credentials
   ```bash
   cf service-key checklist-postgres-db checklist-postgres-key
   ```

4. Initialize schema
   ```bash
   psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f btp-postgres-schema.sql
   ```

**Verification:**
```bash
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "\dt public.*"
```

### Phase 3: Deploy Backend API

**Key Tasks:**
1. Install backend dependencies
   ```bash
   cd backend
   npm install
   ```

2. Test locally (optional)
   ```bash
   # Set environment variables
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_USER=postgres
   export DB_PASSWORD=yourpassword
   export DB_NAME=checklist_db
   
   npm run dev
   ```

3. Deploy via MTA
   ```bash
   cd ..
   mbt build
   cf deploy mta_archives/checklist-app_1.0.0.mtar
   ```

**Verification:**
```bash
# Check backend health
curl https://[backend-url]/health
```

### Phase 4: Migrate Data from Supabase

**Export from Supabase:**
```bash
# Using Supabase CLI
supabase db dump -f supabase_data_dump.sql

# Or using pg_dump
pg_dump -h db.[project-ref].supabase.co \
  -U postgres -W -d postgres \
  --data-only --schema=public \
  -t users -t buckets -t tags_master \
  -t categories_master -t checklist_headers \
  -t checklist_items -t checklist_template_headers \
  -t checklist_template_items \
  -f supabase_data.sql
```

**Clean and Transform:**
```bash
# Remove Supabase-specific data
sed -i '/auth\./d; /storage\./d; /realtime\./d' supabase_data.sql

# Update user_id references (if needed)
# You may need to create a mapping script if user IDs change
```

**Import to BTP PostgreSQL:**
```bash
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f supabase_data.sql
```

**Verification:**
```sql
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM buckets) as buckets,
  (SELECT COUNT(*) FROM checklist_headers) as checklists,
  (SELECT COUNT(*) FROM checklist_items) as items;
```

### Phase 5: Update Frontend Code

**Remove Supabase Dependencies:**

1. Update `package.json`:
   ```bash
   npm uninstall @supabase/supabase-js
   ```

2. Create new API client (`lib/apiClient.ts`):
   ```typescript
   const API_BASE_URL = '/api'; // Via App Router proxy

   export const apiClient = {
     async fetch(endpoint: string, options?: RequestInit) {
       const response = await fetch(`${API_BASE_URL}${endpoint}`, {
         ...options,
         headers: {
           'Content-Type': 'application/json',
           ...options?.headers,
         },
         credentials: 'include', // Important for XSUAA cookies
       });

       if (!response.ok) {
         const error = await response.json();
         throw new Error(error.error || 'Request failed');
       }

       return response.json();
     },

     // Auth
     async getSession() {
       return this.fetch('/auth/session', { method: 'POST' });
     },

     async getMe() {
       return this.fetch('/auth/me');
     },

     // Users
     async updateProfile(data: any) {
       return this.fetch('/users/profile', {
         method: 'PUT',
         body: JSON.stringify(data),
       });
     },

     // Buckets
     async getBuckets() {
       return this.fetch('/buckets');
     },

     async createBucket(name: string) {
       return this.fetch('/buckets', {
         method: 'POST',
         body: JSON.stringify({ bucket_name: name }),
       });
     },

     // ... more methods
   };
   ```

3. Update service files to use new API client:

   **Example: `services/authService.ts`**
   ```typescript
   import { apiClient } from '../lib/apiClient';

   export const authService = {
     async getCurrentUser() {
       try {
         const response = await apiClient.getMe();
         return response.user;
       } catch (error) {
         console.error('Failed to get user:', error);
         return null;
       }
     },

     async initializeSession() {
       try {
         const response = await apiClient.getSession();
         return response.user;
       } catch (error) {
         console.error('Failed to initialize session:', error);
         return null;
       }
     },
   };
   ```

4. Update App Router `xs-app.json` to proxy API calls:
   ```json
   {
     "welcomeFile": "/index.html",
     "authenticationMethod": "route",
     "sessionTimeout": 30,
     "routes": [
       {
         "source": "^/api/(.*)$",
         "target": "$1",
         "destination": "backend-api",
         "authenticationType": "xsuaa",
         "csrfProtection": false
       },
       {
         "source": "^/(.*)$",
         "localDir": "resources",
         "authenticationType": "xsuaa"
       }
     ]
   }
   ```

5. Remove Supabase references:
   ```bash
   # Delete or rename old files
   mv lib/supabase.ts lib/supabase.ts.backup
   mv lib/supabaseApi.ts lib/supabaseApi.ts.backup
   
   # Remove Supabase environment variables from .env
   # EXPO_PUBLIC_SUPABASE_URL
   # EXPO_PUBLIC_SUPABASE_ANON_KEY
   ```

### Phase 6: Update Authentication Flow

**Remove Supabase Auth Listeners:**

1. Update `hooks/useAuthStateListener.ts`:
   ```typescript
   import { useEffect } from 'react';
   import { useAppDispatch } from '../store';
   import { setUser, clearUser } from '../store/slices/authSlice';
   import { authService } from '../services/authService';

   export const useAuthStateListener = () => {
     const dispatch = useAppDispatch();

     useEffect(() => {
       // Initialize session from XSUAA
       authService.initializeSession().then(user => {
         if (user) {
           dispatch(setUser(user));
         } else {
           dispatch(clearUser());
         }
       });
     }, [dispatch]);
   };
   ```

2. Remove Google Sign-In button component (no longer needed)
3. Auth is now handled by App Router redirect to IAS

### Phase 7: Testing

**Test Checklist:**

1. **Authentication:**
   - [ ] Access app redirects to IAS login
   - [ ] Google login button appears
   - [ ] Successful login redirects back to app
   - [ ] User profile loads correctly
   - [ ] Session persists across page refreshes

2. **Buckets:**
   - [ ] List buckets
   - [ ] Create new bucket
   - [ ] Delete bucket

3. **Tags:**
   - [ ] List tags
   - [ ] Create new tag
   - [ ] Delete tag

4. **Categories:**
   - [ ] List categories
   - [ ] View by category

5. **Checklists:**
   - [ ] List checklists
   - [ ] Create checklist
   - [ ] View checklist details
   - [ ] Update checklist
   - [ ] Delete checklist
   - [ ] Add items to checklist
   - [ ] Update item status
   - [ ] Delete items

6. **Templates:**
   - [ ] Browse templates
   - [ ] View template details
   - [ ] Create checklist from template
   - [ ] Create new template
   - [ ] Update template
   - [ ] Delete template

**Load Testing:**
```bash
# Install Apache Bench
brew install httpd

# Test backend API
ab -n 1000 -c 10 https://[backend-url]/api/buckets
```

### Phase 8: Cleanup

**After successful migration:**

1. Decommission Supabase project:
   - Export final backup
   - Pause project (to stop billing)
   - Eventually delete project

2. Update DNS/domains if needed

3. Remove Supabase code:
   ```bash
   rm lib/supabase.ts.backup
   rm lib/supabaseApi.ts.backup
   git add -A
   git commit -m "Complete migration to SAP BTP"
   ```

4. Update documentation

## Rollback Plan

If migration fails, you can roll back:

1. Revert frontend changes:
   ```bash
   git checkout main -- lib/supabase.ts
   npm install @supabase/supabase-js
   ```

2. Redeploy to Netlify:
   ```bash
   npm run build:web
   netlify deploy --prod
   ```

3. Keep Supabase project active

## Cost Comparison

### Supabase (Current)
- **Free tier**: 500MB database, 1GB file storage
- **Pro**: $25/month for 8GB database, 100GB storage

### SAP BTP (After Migration)
- **PostgreSQL small**: ~$40/month (2 vCPU, 8GB RAM)
- **App Router**: ~$10/month (256MB memory)
- **Backend Service**: ~$10/month (512MB memory)
- **XSUAA**: Free (included)
- **IAS**: Free (social login)

**Total**: ~$60/month for production-ready setup

## Monitoring and Operations

**Check Application Status:**
```bash
cf apps
```

**View Logs:**
```bash
cf logs checklist-backend-srv --recent
cf logs checklist-app-approuter --recent
```

**Scale Applications:**
```bash
cf scale checklist-backend-srv -i 2  # 2 instances
cf scale checklist-backend-srv -m 1G # 1GB memory
```

**Database Monitoring:**
```sql
-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Support and Troubleshooting

### Common Issues

**Issue: 503 Service Unavailable**
- Check backend service is running: `cf apps`
- View backend logs: `cf logs checklist-backend-srv --recent`
- Restart if needed: `cf restart checklist-backend-srv`

**Issue: Database connection timeout**
- Verify service binding: `cf env checklist-backend-srv`
- Check PostgreSQL service status: `cf services`
- Verify credentials: `cf service-key checklist-postgres-db checklist-postgres-key`

**Issue: Authentication fails**
- Check IAS configuration
- Verify XSUAA trust configuration
- Check App Router logs: `cf logs checklist-app-approuter --recent`

**Issue: API returns 401 Unauthorized**
- Verify JWT token is being passed
- Check XSUAA service binding on backend
- Verify user has required role collections

## Next Steps

After successful migration:

1. ✅ Set up CI/CD pipeline
2. ✅ Configure production monitoring (Dynatrace, SAP Cloud ALM)
3. ✅ Set up automated backups
4. ✅ Implement caching layer (Redis)
5. ✅ Add rate limiting and DDoS protection
6. ✅ Set up SSL certificates for custom domains
7. ✅ Implement comprehensive logging and tracing

## Conclusion

This migration moves your application to an enterprise-grade SAP BTP architecture with:
- **Centralized authentication** via IAS with social login
- **Managed database** on SAP BTP PostgreSQL
- **Scalable backend** on Cloud Foundry
- **Integrated security** with XSUAA
- **Production-ready** infrastructure

All code and data now run within SAP's managed environment with enterprise support.
