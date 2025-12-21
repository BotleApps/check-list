/**
 * Database Initialization Script
 * 
 * This script creates the necessary database tables if they don't exist.
 * It's safe to run multiple times (uses IF NOT EXISTS).
 * 
 * Run automatically on backend startup or manually with: node db-init.js
 */

const db = require('./db');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  console.log('🔄 Initializing database schema...');
  
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'btp-postgres-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await db.query(schema);
    
    console.log('✅ Database schema initialized successfully!');
    
    // Verify tables exist
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Tables created:', result.rows.map(r => r.table_name).join(', '));
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
