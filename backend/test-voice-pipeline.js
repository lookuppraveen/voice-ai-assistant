/**
 * Voice Pipeline Diagnostic Test
 * Run: node test-voice-pipeline.js
 * 
 * Tests:
 *  1. ElevenLabs TTS
 *  2. OpenAI TTS
 *  3. OpenAI Whisper (STT) — using a generated audio buffer
 *  4. /api/sessions/tts route (checks it's not caught by /:id)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const elevenLabs = require('./src/services/elevenLabsService');
const openaiTts  = require('./src/services/openaiTtsService');
const whisper    = require('./src/services/whisperService');
const { query }  = require('./src/config/database');

const TEST_TEXT = 'Hello, this is a voice pipeline test.';

async function runTest(name, fn) {
  process.stdout.write(`  ▸ ${name} ... `);
  try {
    const result = await fn();
    console.log(`✅  ${result}`);
    return true;
  } catch (err) {
    console.log(`❌  ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  Voice AI Pipeline Diagnostic');
  console.log('═══════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  // ── 1. Database connectivity ────────────────────────────────────────────────
  console.log('📦  Database');
  const dbOk = await runTest('Connect & query system_settings', async () => {
    const res = await query(`SELECT setting_value FROM system_settings WHERE setting_key = 'tts_provider'`);
    const provider = res.rows.length > 0 ? res.rows[0].setting_value : 'elevenlabs (default)';
    return `Connected. TTS provider = "${provider}"`;
  });
  dbOk ? passed++ : failed++;

  // ── 2. ElevenLabs TTS ───────────────────────────────────────────────────────
  console.log('\n🔊  ElevenLabs TTS');
  const elOk = await runTest('Generate audio buffer', async () => {
    const buf = await elevenLabs.generateAudio(TEST_TEXT);
    if (!buf || buf.length === 0) throw new Error('Empty buffer returned');
    fs.writeFileSync(path.join(__dirname, 'test-output-elevenlabs.mp3'), buf);
    return `${buf.length} bytes written to test-output-elevenlabs.mp3`;
  });
  elOk ? passed++ : failed++;

  // ── 3. OpenAI TTS ──────────────────────────────────────────────────────────
  console.log('\n🔊  OpenAI TTS');
  const oaiTtsOk = await runTest('Generate audio buffer', async () => {
    const buf = await openaiTts.generateAudio(TEST_TEXT);
    if (!buf || buf.length === 0) throw new Error('Empty buffer returned');
    fs.writeFileSync(path.join(__dirname, 'test-output-openai-tts.mp3'), buf);
    return `${buf.length} bytes written to test-output-openai-tts.mp3`;
  });
  oaiTtsOk ? passed++ : failed++;

  // ── 4. OpenAI Whisper (STT) ─────────────────────────────────────────────────
  console.log('\n🎤  OpenAI Whisper (STT)');
  const whisperOk = await runTest('Transcribe a sample MP3 buffer', async () => {
    // Use the OpenAI TTS output as input to Whisper for a real round-trip test
    const audioPath = path.join(__dirname, 'test-output-openai-tts.mp3');
    if (!fs.existsSync(audioPath)) throw new Error('test-output-openai-tts.mp3 not found — run OpenAI TTS test first');
    const audioBuf = fs.readFileSync(audioPath);
    const text = await whisper.transcribeAudio(audioBuf, 'audio/mpeg', 'sample.mp3');
    if (!text) throw new Error('No transcription returned');
    return `Transcribed: "${text}"`;
  });
  whisperOk ? passed++ : failed++;

  // ── 5. Route order check (static analysis) ─────────────────────────────────
  console.log('\n🔀  Route Order (static check)');
  const routeOk = await runTest('Verify /tts is before /:id in sessions.js', async () => {
    const src = fs.readFileSync(path.join(__dirname, 'src/routes/sessions.js'), 'utf8');
    const ttsPos = src.indexOf("router.post('/tts'");
    const idPos  = src.indexOf("router.get('/:id'");
    if (ttsPos === -1) throw new Error("/tts route not found in sessions.js");
    if (idPos  === -1) throw new Error("/:id route not found in sessions.js");
    if (ttsPos > idPos) throw new Error(`❌ STILL WRONG: /tts (pos ${ttsPos}) is AFTER /:id (pos ${idPos})`);
    return `/tts at pos ${ttsPos} comes BEFORE /:id at pos ${idPos} ✓`;
  });
  routeOk ? passed++ : failed++;

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('⚠️  Fix the failing services above before testing in the browser.\n');
    process.exit(1);
  } else {
    console.log('🎉  All checks passed! Start both servers and test in the browser.\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
