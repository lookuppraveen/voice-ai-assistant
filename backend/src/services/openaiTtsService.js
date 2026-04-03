const axios = require('axios');
const env = require('../config/env');

/**
 * Generates audio buffer from text using OpenAI's TTS API.
 * @param {string} text - The input text
 * @returns {Promise<Buffer>} The generated audio buffer
 */
const generateAudio = async (text, options = {}) => {
  if (!text || text.trim() === '') return null;
  const voice = options.voiceId || 'alloy'; // default openai voice
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        voice: voice,
        input: text,
        response_format: 'mp3'
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
    if (error.response?.status === 401) {
      throw new Error('OpenAI API Key is invalid or expired.');
    }
    console.error('OpenAI TTS Error:', error.response?.data?.error || error.message);
    throw new Error('Failed to generate audio via OpenAI TTS.');
  }
};

module.exports = { generateAudio };
