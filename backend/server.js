const app = require('./src/app');
const env = require('./src/config/env');
const { pool } = require('./src/config/database');

const server = app.listen(env.port, async () => {
  try {
    await pool.query('SELECT 1');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN temp_password VARCHAR(255)');
    } catch(e) {} // Ignore if column already exists

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          setting_key VARCHAR(50) PRIMARY KEY,
          setting_value VARCHAR(255) NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`
        INSERT INTO system_settings (setting_key, setting_value) 
        VALUES ('tts_provider', 'elevenlabs') 
        ON CONFLICT (setting_key) DO NOTHING
      `);
    } catch(e) {
      console.error('Failed to create system_settings:', e.message);
    }

    console.log(`Database connected successfully`);
    console.log(`Server running on http://localhost:${env.port} [${env.nodeEnv}]`);
  } catch (err) {
    console.error('\n❌ Database connection failed:', err.message);
    console.error('\n👉 Fix: Set DATABASE_URL in backend/.env with your Neon/Supabase connection string.');
    console.error('   Get a free DB at: https://neon.tech\n');
    process.exit(1);
  }
});

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await pool.end();
    console.log('Server and database pool closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
