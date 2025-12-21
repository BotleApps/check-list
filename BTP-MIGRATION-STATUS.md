# BTP Migration Status

## Overview
Successfully migrated the Checklists application from Supabase to SAP BTP Cloud Foundry.

## Deployment Status: ✅ SUCCESSFUL

### Deployed Services
- **Backend API**: https://sliachieve-sli-smart-labs-dev-fv8e05xs-development-chec1166d8c7.cfapps.eu12.hana.ondemand.com
- **Frontend (App Router)**: https://sliachieve-sli-smart-labs-dev-fv8e05xs-development-chec533018b9.cfapps.eu12.hana.ondemand.com
- **PostgreSQL Database**: Provisioned (development plan)
- **XSUAA Service**: Configured with xsappname "checklist-task-manager"

### Role Collections
- `ChecklistTaskManager_Viewer` - Read-only access
- `ChecklistTaskManager_Editor` - Full access

## Migration Progress

### ✅ Completed

1. **Infrastructure**
   - Backend API deployed and running
   - Frontend deployed via App Router
   - PostgreSQL database provisioned
   - XSUAA authentication service configured
   - App Router routing configured (`/api/*` → backend)

2. **API Layer**
   - Created `lib/btpApiClient.ts` with complete REST API wrapper
   - All endpoints implemented:
     * Auth: session, getCurrentUser
     * Users: profile CRUD
     * Buckets: list, create, delete
     * Tags: list, create, delete
     * Categories: list
     * Checklists: full CRUD + items management
     * Templates: full CRUD + instantiation

3. **Authentication**
   - Migrated `services/authService.ts` to use BTP API
   - Replaced `app/auth/login.tsx` with simple SAP login
   - Replaced `app/auth/register.tsx` with admin instructions
   - Removed callback files (OAuth handled by XSUAA)
   - Deleted `lib/supabase.ts`

4. **Data Services (Partial)**
   - ✅ Migrated `services/bucketService.ts` to BTP API

### 🔄 In Progress / Pending

1. **Data Services** (Need Migration)
   - `services/tagService.ts`
   - `services/categoryService.ts`
   - `services/checklistService.ts`
   - `services/templateService.ts`
   - `services/templateGroupService.ts`
   - `services/taskGroupService.ts`

2. **Cleanup**
   - Remove `@supabase/supabase-js` from package.json
   - Delete `services/googleAuthService.ts`
   - Check `services/aiChecklistService.ts` for Supabase usage
   - Remove `components/GoogleSignInButton.tsx` if unused

3. **Database**
   - Initialize PostgreSQL with schema (`init-database.sh`)
   - Requires `psql` client installation

4. **Testing**
   - End-to-end authentication flow
   - CRUD operations for all entities
   - Verify session management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          User                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ├──> Login Button → "/" (triggers XSUAA)
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    App Router (Frontend)                     │
│  URL: https://...chec533018b9.cfapps.eu12.hana.ondemand.com│
│                                                               │
│  • Serves static files (React/Expo PWA)                      │
│  • Handles XSUAA authentication                              │
│  • Routes /api/* → backend-api destination                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ /api/* requests
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Node.js)                     │
│  URL: https://...chec1166d8c7.cfapps.eu12.hana.ondemand.com│
│                                                               │
│  • Express.js REST API                                       │
│  • Validates XSUAA JWT tokens                                │
│  • Connects to PostgreSQL                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (RDS)                       │
│                                                               │
│  • Tables: users, buckets, tags, categories, checklists,    │
│    checklist_items, templates, template_items, etc.         │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### BTP (Current)
```
User clicks "Sign in with SAP"
  ↓
Redirects to "/" (frontend root)
  ↓
App Router intercepts (no XSUAA session)
  ↓
Redirects to XSUAA login page
  ↓
User enters SAP credentials
  ↓
XSUAA validates and creates session
  ↓
Redirects back to App Router with session cookie
  ↓
App Router serves authenticated app
  ↓
Frontend makes API calls to /api/*
  ↓
App Router adds XSUAA JWT to requests
  ↓
Backend validates JWT and processes request
```

### Old Supabase Flow (Removed)
```
❌ User clicks "Sign in with Google"
❌ Redirects to Supabase OAuth
❌ Supabase validates with Google
❌ Returns to callback screen
❌ Frontend stores Supabase session
❌ API calls include Supabase token
```

## Key Changes

### Authentication
- **Before**: Email/password + Google OAuth via Supabase
- **After**: XSUAA authentication via SAP IAS (single sign-on)

### Authorization
- **Before**: Row-level security in Supabase
- **After**: Backend API validates JWT and checks user permissions

### Session Management
- **Before**: JWT token in localStorage, refreshed automatically
- **After**: Cookie-based XSUAA session managed by App Router

### API Communication
- **Before**: Direct Supabase client SDK calls
- **After**: REST API calls through `/api/*` endpoints

## BTP API Client

All frontend API calls now go through `lib/btpApiClient.ts`:

```typescript
import { btpApi } from '../lib/btpApiClient';

// Authentication
const user = await btpApi.getCurrentUser();

// Checklists
const checklists = await btpApi.getChecklists({ bucket_id: '123' });
const checklist = await btpApi.getChecklist('checklist-id');
await btpApi.createChecklist({ title: 'New List', ... });
await btpApi.updateChecklist('id', { title: 'Updated' });
await btpApi.deleteChecklist('id');

// Items
await btpApi.addChecklistItem('checklist-id', { title: 'Task', ... });
await btpApi.updateChecklistItem('checklist-id', 'item-id', { is_completed: true });

// Templates
const templates = await btpApi.getTemplates('category-id');
await btpApi.instantiateTemplate('template-id', { checklist_title: 'My List' });
```

## Next Steps

See `SUPABASE-MIGRATION-TODO.md` for detailed tasks.

### Priority 1: Data Services Migration
Update all service files to use `btpApiClient` instead of Supabase:
- tagService.ts
- categoryService.ts
- checklistService.ts
- templateService.ts
- templateGroupService.ts
- taskGroupService.ts

### Priority 2: Cleanup
```bash
npm uninstall @supabase/supabase-js
rm services/googleAuthService.ts
```

### Priority 3: Database Initialization
```bash
brew install postgresql
chmod +x init-database.sh
./init-database.sh
```

### Priority 4: Testing
Test complete authentication and CRUD flows.

## Configuration

### PostgreSQL Connection
```
Host: postgres-81397d70-2234-4e79-afad-4069e027f432.crkc3ulytfr9.eu-central-1.rds.amazonaws.com
Port: 8455
Database: LjYuquxpiCOc
Username: 51fec5b3a422
```

### XSUAA
```
xsappname: checklist-task-manager
Role Collections: ChecklistTaskManager_Viewer, ChecklistTaskManager_Editor
```

## References

- `DEPLOYMENT-SUCCESS.md` - Full deployment details
- `SUPABASE-MIGRATION-TODO.md` - Remaining migration tasks
- `lib/btpApiClient.ts` - API client implementation
- `btp-postgres-schema.sql` - Database schema
- `init-database.sh` - Database initialization script

## Deployment Commands

```bash
# Build and deploy
npm run build
cf push

# Or use deployment script
./deploy-cf.sh
```

## Support

For issues:
1. Check BTP Cockpit for service status
2. View backend logs: `cf logs backend-srv --recent`
3. View app router logs: `cf logs approuter --recent`
4. Check `TESTING-GUIDE.md` for debugging steps
