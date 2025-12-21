# Supabase to BTP Migration - Remaining Tasks

## Completed ✅

1. **Backend Deployment**
   - ✅ Backend API deployed to BTP
   - ✅ PostgreSQL database provisioned
   - ✅ XSUAA authentication configured
   - ✅ App Router configured for authentication proxy

2. **API Client Layer**
   - ✅ Created `lib/btpApiClient.ts` with all endpoints

3. **Authentication Layer**
   - ✅ Updated `services/authService.ts` to use BTP API
   - ✅ Replaced `app/auth/login.tsx` with BTP version
   - ✅ Replaced `app/auth/register.tsx` with admin-only message
   - ✅ Deleted callback files (callback.tsx, callback-new.tsx, callback-clean.tsx, callback-mobile.tsx)
   - ✅ Deleted `lib/supabase.ts`

4. **Bucket Service**
   - ✅ Updated `services/bucketService.ts` to use BTP API

## Remaining Tasks 🔄

### High Priority

1. **Update Data Services** - All services need to be migrated from Supabase to BTP API:

   **Tag Service** (`services/tagService.ts`):
   ```typescript
   // Replace Supabase queries with:
   import { btpApi } from '../lib/btpApiClient';
   
   // getTags() -> btpApi.getTags()
   // createTag(name, color) -> btpApi.createTag(name, color)
   // deleteTag(tagId) -> btpApi.deleteTag(tagId)
   ```

   **Category Service** (`services/categoryService.ts`):
   ```typescript
   // Replace Supabase queries with:
   import { btpApi } from '../lib/btpApiClient';
   
   // getCategories() -> btpApi.getCategories()
   ```

   **Checklist Service** (`services/checklistService.ts`):
   ```typescript
   // Replace Supabase queries with:
   import { btpApi } from '../lib/btpApiClient';
   
   // getUserChecklists(userId) -> btpApi.getChecklists({})
   // getChecklistWithItems(checklistId) -> btpApi.getChecklist(checklistId)
   // createChecklist(...) -> btpApi.createChecklist({...})
   // updateChecklist(...) -> btpApi.updateChecklist(checklistId, {...})
   // deleteChecklist(checklistId) -> btpApi.deleteChecklist(checklistId)
   // addItem(checklistId, item) -> btpApi.addChecklistItem(checklistId, item)
   // updateItem(itemId, updates) -> btpApi.updateChecklistItem(checklistId, itemId, updates)
   // deleteItem(itemId) -> btpApi.deleteChecklistItem(checklistId, itemId)
   ```

   **Template Service** (`services/templateService.ts`):
   ```typescript
   // Replace Supabase queries with:
   import { btpApi } from '../lib/btpApiClient';
   
   // getTemplates() -> btpApi.getTemplates()
   // getTemplate(templateId) -> btpApi.getTemplate(templateId)
   // createTemplate(...) -> btpApi.createTemplate({...})
   // updateTemplate(...) -> btpApi.updateTemplate(templateId, {...})
   // deleteTemplate(templateId) -> btpApi.deleteTemplate(templateId)
   // instantiateTemplate(...) -> btpApi.instantiateTemplate(templateId, {...})
   ```

   **Template Group Service** (`services/templateGroupService.ts`):
   ```typescript
   // Migrate Supabase queries to BTP API
   ```

   **Task Group Service** (`services/taskGroupService.ts`):
   ```typescript
   // Migrate Supabase queries to BTP API
   ```

2. **Remove Supabase-specific Services**:
   - ❌ Delete `services/googleAuthService.ts` (OAuth handled by SAP IAS)
   - ❌ Delete `services/aiChecklistService.ts` if it uses Supabase directly

3. **Remove Supabase Dependencies**:
   ```bash
   npm uninstall @supabase/supabase-js
   npm uninstall @react-native-async-storage/async-storage  # if only used for Supabase
   ```

4. **Update Redux Store** (if needed):
   - Check `store/slices/authSlice.ts` for Supabase references
   - Update to work with BTP authentication flow
   - Remove any Supabase session management

5. **Remove Unused Components**:
   - Check if `components/GoogleSignInButton.tsx` is still referenced
   - Remove if no longer needed

### Medium Priority

6. **Initialize PostgreSQL Database**:
   ```bash
   # Install PostgreSQL client
   brew install postgresql
   
   # Run initialization script
   chmod +x init-database.sh
   ./init-database.sh
   ```

7. **Backend API Enhancements** (if needed):
   - Add bucket update endpoint (`PUT /api/buckets/:id`)
   - Verify all endpoints match btpApiClient expectations
   - Add error handling and validation

8. **Environment Configuration**:
   - Remove Supabase environment variables from `.env` (if exists)
   - Ensure only BTP configuration remains

### Testing

9. **End-to-End Testing Checklist**:
   - [ ] Access frontend URL
   - [ ] Click "Sign in with SAP" button
   - [ ] Successfully authenticate via XSUAA
   - [ ] View checklists list
   - [ ] Create a new checklist
   - [ ] Add items to checklist
   - [ ] Mark items as complete
   - [ ] Edit checklist
   - [ ] Delete checklist
   - [ ] Create and use templates
   - [ ] Manage tags
   - [ ] Manage buckets/folders

### Low Priority

10. **Configure IAS for Google OAuth** (Optional):
    - Follow `IAS-SOCIAL-LOGIN-SETUP.md`
    - Configure Google OAuth in IAS Admin Console
    - Test social login flow

11. **Data Migration** (if needed):
    - Export data from old Supabase instance
    - Transform to BTP PostgreSQL schema
    - Import into BTP database

## Service Migration Pattern

When migrating each service file, follow this pattern:

```typescript
// OLD (Supabase)
import { supabase } from '../lib/supabase';

async someMethod() {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw new Error(error.message);
  return data || [];
}

// NEW (BTP API)
import { btpApi } from '../lib/btpApiClient';

async someMethod() {
  const response = await btpApi.getSomeData();
  
  if (response.error) throw new Error(response.error);
  return response.data || [];
}
```

## Files Requiring Attention

### Must Update:
- `services/tagService.ts`
- `services/categoryService.ts`
- `services/checklistService.ts`
- `services/templateService.ts`
- `services/templateGroupService.ts`
- `services/taskGroupService.ts`

### Must Delete:
- `services/googleAuthService.ts`

### Check/Update if Needed:
- `services/aiChecklistService.ts`
- `store/slices/authSlice.ts`
- `components/GoogleSignInButton.tsx`

### Configuration:
- `package.json` (remove @supabase/supabase-js)

## Quick Migration Script

```bash
# 1. Find all Supabase imports
grep -r "from '../lib/supabase'" services/

# 2. Find all Supabase usage
grep -r "supabase\." services/

# 3. Remove Supabase dependency
npm uninstall @supabase/supabase-js

# 4. Build and test
npm run build
npm start
```

## Success Criteria

✅ No Supabase imports in codebase  
✅ @supabase/supabase-js removed from package.json  
✅ Login redirects to XSUAA authentication  
✅ All CRUD operations work through BTP API  
✅ Database initialized with schema  
✅ No console errors related to Supabase  

## URLs

- **Frontend**: https://sliachieve-sli-smart-labs-dev-fv8e05xs-development-chec533018b9.cfapps.eu12.hana.ondemand.com
- **Backend API**: https://sliachieve-sli-smart-labs-dev-fv8e05xs-development-chec1166d8c7.cfapps.eu12.hana.ondemand.com

## Next Steps

1. Update all service files to use BTP API (see pattern above)
2. Remove Supabase dependencies
3. Initialize database
4. Test authentication flow
5. Test all CRUD operations
6. Configure IAS for Google OAuth (optional)
