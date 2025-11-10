const { Pool } = require('pg');
const cfenv = require('cfenv');

const appEnv = cfenv.getAppEnv();
let pool;

// Get PostgreSQL credentials from CF environment
const pgService = appEnv.getService('checklist-postgres-db');

if (pgService) {
  pool = new Pool({
    host: pgService.credentials.hostname,
    port: pgService.credentials.port,
    user: pgService.credentials.username,
    password: pgService.credentials.password,
    database: pgService.credentials.database,
    ssl: { rejectUnauthorized: false },
    max: 20, // maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  console.log('✅ PostgreSQL pool configured');
} else {
  // Fallback for local development
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'checklist_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  console.log('⚠️  Using local PostgreSQL configuration');
}

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};
