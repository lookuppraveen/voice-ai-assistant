const { query } = require('./src/config/database');
const elevenLabs = require('./src/services/elevenLabsService');
const openaiTts = require('./src/services/openaiTtsService');
require('dotenv').config();

async function test() {
  console.log('Testing TTS Services...');
  
  try {
    const settingRes = await query(`SELECT setting_value FROM system_settings WHERE setting_key = 'tts_provider'`);
    const provider = settingRes.rows.length > 0 ? settingRes.rows[0].setting_value : 'elevenlabs';
    console.log('Current Provider in DB:', provider);
    
    const text = "Testing audio generation.";
    console.log(`Generating audio for: "${text}" using ${provider}...`);
    
    let buffer;
    if (provider === 'openai') {
      buffer = await openaiTts.generateAudio(text);
    } else {
      buffer = await elevenLabs.generateAudio(text);
    }
    
    if (buffer && buffer.length > 0) {
      console.log('✅ SUCCESS: Generated audio buffer of size:', buffer.length);
    } else {
      console.log('❌ FAILURE: Buffer is empty or null');
    }
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data.toString());
    }
  } finally {
    process.exit();
  }
}

test();
