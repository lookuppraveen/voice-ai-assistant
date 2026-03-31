const axios = require('axios');
const env = require('../config/env');

const generateAudio = async (text, overrides = {}) => {
  const voiceId = overrides.voiceId || env.elevenlabs.voiceId;
  
  if (!text || text.trim() === '') return null;

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_turbo_v2_5', // Fast, low latency conversational model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': env.elevenlabs.apiKey,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 10000,
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('ElevenLabs API Key is invalid or expired.');
    }
    throw new Error('Failed to generate audio via ElevenLabs.');
  }
};

module.exports = { generateAudio };
