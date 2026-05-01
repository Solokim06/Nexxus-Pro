const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get executed migrations
    const { rows: executed } = await client.query('SELECT version FROM migrations ORDER BY version');
    const executedVersions = new Set(executed.map(r => r.version));
    
    // Get migration files
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(f => f.match(/^\d{3}_.*\.sql$/))
      .sort();
    
    for (const file of migrationFiles) {
      const version = file.substring(0, 3);
      
      if (executedVersions.has(version)) {
        console.log(`✓ Migration ${version} already executed, skipping`);
        continue;
      }
      
      console.log(`Running migration ${version}: ${file}`);
      
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO migrations (version, name) VALUES ($1, $2)', [version, file]);
      
      console.log(`✓ Migration ${version} completed`);
    }
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();