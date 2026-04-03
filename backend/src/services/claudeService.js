const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

// Dynamic topics loaded from DB via systemPrompt param
const buildConversationMessages = (history) => {
  return history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));
};

const getAIResponse = async (conversationHistory, systemPrompt) => {
  const messages = buildConversationMessages(conversationHistory);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: systemPrompt,
    messages,
  });

  return response.content[0].text;
};

const evaluateSession = async (conversationHistory, scenarioName) => {
  const transcript = conversationHistory
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'CANDIDATE' : 'PROSPECT'}: ${m.content}`)
    .join('\n');

  const evaluationPrompt = `You are an expert sales trainer evaluating a "${scenarioName}" training session.

TRANSCRIPT:
${transcript}

Evaluate this sales call and provide a structured JSON response with exactly this format:
{
  "overall_score": <integer 1-100>,
  "breakdown": {
    "confidence": <integer 1-100>,
    "clarity": <integer 1-100>,
    "objection_handling": <integer 1-100>,
    "closing_technique": <integer 1-100>,
    "product_knowledge": <integer 1-100>,
    "rapport_building": <integer 1-100>
  },
  "strengths": [<string>, <string>, <string>],
  "weaknesses": [<string>, <string>, <string>],
  "improvement_suggestions": [
    {"area": <string>, "suggestion": <string>, "example": <string>},
    {"area": <string>, "suggestion": <string>, "example": <string>},
    {"area": <string>, "suggestion": <string>, "example": <string>}
  ],
  "summary": <string 2-3 sentences overall assessment>
}

Be specific, honest, and constructive. Base scores strictly on the actual conversation.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: evaluationPrompt }],
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse evaluation response');

  return JSON.parse(jsonMatch[0]);
};

module.exports = { getAIResponse, evaluateSession };
