const axios = require('axios');
const FormData = require('form-data');
const env = require('../config/env');

/**
 * Transcribes audio buffer using OpenAI Whisper API.
 * @param {Buffer} audioBuffer - Raw audio data
 * @param {string} mimeType - e.g. 'audio/webm', 'audio/wav'
 * @param {string} filename - e.g. 'recording.webm'
 * @returns {Promise<string>} Transcribed text
 */
const transcribeAudio = async (audioBuffer, mimeType = 'audio/webm', filename = 'recording.webm') => {
  const formData = new FormData();
  formData.append('file', audioBuffer, {
    filename,
    contentType: mimeType,
  });
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const response = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    formData,
    {
      headers: {
        Authorization: `Bearer ${env.openai.apiKey}`,
        ...formData.getHeaders(),
      },
      timeout: 30000,
    }
  );

  const text = response.data.text?.trim();

  // If whisper returns empty text (e.g., silence was recorded), handle it gracefully
  // by passing a simulated "no response" marker to the AI to prompt the user
  return text || "*(Candidate remained silent)*";
};

module.exports = { transcribeAudio };
