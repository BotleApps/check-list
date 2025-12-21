# SAP BTP PostgreSQL (Hyperscaler) Setup Guide

## Overview
This guide provisions a PostgreSQL database on SAP BTP Cloud Foundry using the Hyperscaler option.

## Prerequisites
- SAP BTP Cloud Foundry space with PostgreSQL service enabled
- CF CLI installed and logged in
- Schema file: `btp-postgres-schema.sql`

## Step 1: Check Available Services

```bash
cf marketplace
```

Look for `postgresql-db` or `hyperscaler-postgres` in the service list.

## Step 2: Create PostgreSQL Service Instance

### Option A: Using CF CLI

```bash
cf create-service postgresql-db small checklist-postgres-db
```

**Available Plans:**
- `small` - Development/testing (shared)
- `medium` - Production (dedicated, 2 vCPU, 8GB RAM)
- `large` - Production (dedicated, 4 vCPU, 16GB RAM)

### Option B: Using MTA Descriptor

Add to `mta.yaml`:

```yaml
resources:
  - name: checklist-postgres-db
    type: org.cloudfoundry.managed-service
    parameters:
      service: postgresql-db
      service-plan: small
      config:
        engine_version: "15"
        storage: 10
```

Then deploy:

```bash
mbt build
cf deploy mta_archives/checklist-app_1.0.0.mtar
```

## Step 3: Create Service Key

```bash
cf create-service-key checklist-postgres-db checklist-postgres-key
```

## Step 4: Get Connection Details

```bash
cf service-key checklist-postgres-db checklist-postgres-key
```

Output example:

```json
{
  "hostname": "postgres.example.com",
  "port": 5432,
  "username": "user123",
  "password": "pass456",
  "database": "dbname789",
  "uri": "postgresql://user123:pass456@postgres.example.com:5432/dbname789",
  "sslmode": "require"
}
```

## Step 5: Connect and Initialize Schema

### Using psql

```bash
# Extract credentials from service key
PGHOST=$(cf service-key checklist-postgres-db checklist-postgres-key | jq -r '.hostname')
PGPORT=$(cf service-key checklist-postgres-db checklist-postgres-key | jq -r '.port')
PGUSER=$(cf service-key checklist-postgres-db checklist-postgres-key | jq -r '.username')
PGPASSWORD=$(cf service-key checklist-postgres-db checklist-postgres-key | jq -r '.password')
PGDATABASE=$(cf service-key checklist-postgres-db checklist-postgres-key | jq -r '.database')

# Connect
export PGPASSWORD
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f btp-postgres-schema.sql
```

### Alternative: Create tunnel and use GUI

```bash
# Install CF CLI plugin
cf install-plugin -r CF-Community "Service Connection"

# Create tunnel
cf create-service-key checklist-postgres-db tunnel-key
cf connect-to-service checklist-postgres-db tunnel-key
```

Then use your favorite PostgreSQL GUI (DBeaver, pgAdmin) to connect via `localhost:5432`.

## Step 6: Verify Installation

```bash
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "\dt public.*"
```

Expected output:

```
                    List of relations
 Schema |              Name              | Type  |  Owner
--------+--------------------------------+-------+---------
 public | buckets                        | table | user123
 public | categories_master              | table | user123
 public | checklist_headers              | table | user123
 public | checklist_items                | table | user123
 public | checklist_template_headers     | table | user123
 public | checklist_template_items       | table | user123
 public | tags_master                    | table | user123
 public | users                          | table | user123
```

## Step 7: Bind to Backend Service

In your backend module's `manifest.yml` or MTA descriptor:

```yaml
modules:
  - name: checklist-backend-srv
    type: nodejs
    path: backend
    requires:
      - name: checklist-postgres-db
      - name: checklist-uaa
    provides:
      - name: backend-api
        properties:
          url: ${default-url}
```

## Step 8: Access Credentials in Node.js

```javascript
// backend/server.js
const cfenv = require('cfenv');
const { Pool } = require('pg');

const appEnv = cfenv.getAppEnv();
const pgService = appEnv.getService('checklist-postgres-db');

const pool = new Pool({
  host: pgService.credentials.hostname,
  port: pgService.credentials.port,
  user: pgService.credentials.username,
  password: pgService.credentials.password,
  database: pgService.credentials.database,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
```

## Migration from Supabase

### Export Data from Supabase

```bash
# Using Supabase CLI
supabase db dump -f supabase_dump.sql

# Or using pg_dump directly
pg_dump -h db.your-project.supabase.co -U postgres -W -d postgres -f supabase_dump.sql
```

### Import to BTP PostgreSQL

```bash
# Clean the dump file (remove Supabase-specific schemas)
sed -i '/auth\./d; /storage\./d; /realtime\./d' supabase_dump.sql

# Import
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f supabase_dump.sql
```

### Data-Only Import

If schema is already created:

```bash
# Export data only from Supabase
pg_dump -h db.your-project.supabase.co -U postgres -W -d postgres \
  --data-only --schema=public -f supabase_data.sql

# Import to BTP
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f supabase_data.sql
```

## Monitoring and Maintenance

### Check Database Size

```sql
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size;
```

### Check Table Sizes

```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### View Active Connections

```sql
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query
FROM pg_stat_activity
WHERE datname = current_database();
```

## Backup and Recovery

### Manual Backup

```bash
pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE \
  -F c -b -v -f backup_$(date +%Y%m%d_%H%M%S).backup
```

### Restore from Backup

```bash
pg_restore -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE \
  -v backup_20251108_120000.backup
```

## Troubleshooting

**Connection timeout**
- Check security groups and firewall rules
- Verify SSL/TLS requirements

**Permission denied**
- Ensure user has correct grants
- Check schema ownership

**Service creation failed**
- Verify quota limits in BTP cockpit
- Check service plan availability

## Cost Optimization

**Development**
- Use `small` plan for dev/test
- Stop services when not in use (CF does not support this for databases)
- Share instance across multiple apps

**Production**
- Right-size based on load testing
- Enable connection pooling in application
- Monitor query performance and add indexes

## Next Steps

Once PostgreSQL is provisioned:
1. ✅ Create backend API service
2. ✅ Implement authentication middleware
3. ✅ Build REST endpoints for all operations
4. ✅ Test database connectivity
