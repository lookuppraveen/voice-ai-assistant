const axios = require('axios');
const env = require('../config/env');

/**
 * Generates audio buffer from text using OpenAI's TTS API.
 * @param {string} text - The input text
 * @returns {Promise<Buffer>} The generated audio buffer
 */
const generateAudio = async (text, options = {}) => {
  if (!text || text.trim() === '') return null;
  // 'nova' is slightly more natural for conversational voice than 'alloy'
  const voice = options.voiceId || 'nova';

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',       // tts-1 = fastest; tts-1-hd is higher quality but slower
        voice,
        input: text,
        response_format: 'mp3',
        speed: 1.0,           // 1.0 = natural; increase to 1.1 for slightly faster speech
      },
      {
        headers: {
          'Authorization': `Bearer ${env.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      }
    );
    return Buffer.from(response.data);
  } catch (error) {
    let detail = error.message;

    // Decode error response if it's an ArrayBuffer (due to responseType: 'arraybuffer')
    if (error.response?.data instanceof ArrayBuffer || Buffer.isBuffer(error.response?.data)) {
      try {
        const errorText = Buffer.from(error.response.data).toString();
        const errorJson = JSON.parse(errorText);
        detail = errorJson.error?.message || errorText;
      } catch (e) {
        // Fallback if not JSON
      }
    } else if (error.response?.data?.error?.message) {
      detail = error.response.data.error.message;
    }

    console.error('OpenAI TTS Error Details:', detail);
    
    if (error.response?.status === 401) {
      throw new Error(`OpenAI API Key is invalid or expired: ${detail}`);
    }
    throw new Error(`Failed to generate audio via OpenAI TTS: ${detail}`);
  }
};

module.exports = { generateAudio };
