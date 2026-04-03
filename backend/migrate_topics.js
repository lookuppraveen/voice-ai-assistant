const { query } = require('./src/config/database');

async function migrate() {
  try {
    console.log('Starting migration: Adding category to topics...');
    await query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General'`);
    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
