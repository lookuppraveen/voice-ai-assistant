const axios = require('axios');
const env = require('../config/env');

// Using OpenAI TTS — same API key already configured, works on all plans.
// Voice options: alloy | echo | fable | onyx | nova | shimmer
const TTS_VOICE = 'onyx'; // deep, professional male voice — good for AI prospect

/**
 * Converts text to speech using OpenAI TTS API.
 * @param {string} text - Text to convert
 * @returns {Promise<Buffer>} Audio buffer (mp3)
 */
const textToSpeech = async (text) => {
  const response = await axios.post(
    'https://api.openai.com/v1/audio/speech',
    {
      model: 'tts-1',
      input: text,
      voice: TTS_VOICE,
    },
    {
      headers: {
        Authorization: `Bearer ${env.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 30000,
    }
  );

  return Buffer.from(response.data);
};

module.exports = { textToSpeech };
