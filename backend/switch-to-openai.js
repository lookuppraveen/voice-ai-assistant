const { query } = require('./src/config/database');
require('dotenv').config();

async function run() {
  console.log('Switching TTS provider to OpenAI...');
  try {
    const result = await query(`
      UPDATE system_settings 
      SET setting_value = 'openai' 
      WHERE setting_key = 'tts_provider'
    `);
    
    // Check if it was updated, or if it needs to be inserted
    if (result.rowCount === 0) {
      await query(`
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES ('tts_provider', 'openai')
      `);
    }
    
    console.log('✅ SUCCESS: TTS provider switched to openai.');
    console.log('Now run "node test-tts.js" to verify.');
  } catch (err) {
    console.error('❌ ERROR:', err.message);
  } finally {
    process.exit();
  }
}

run();
