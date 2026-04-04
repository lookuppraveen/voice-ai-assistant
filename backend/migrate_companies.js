const { query } = require('./src/config/database');

async function migrate() {
  console.log('Migrating: Adding is_active to companies...');
  try {
    await query(`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);
    console.log('✅ SUCCESS: is_active column added to companies.');
  } catch (err) {
    console.error('❌ ERROR:', err.message);
  } finally {
    process.exit();
  }
}

migrate();
