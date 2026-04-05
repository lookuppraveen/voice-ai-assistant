const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

/**
 * Build Anthropic messages array from conversation history.
 * History roles: 'user' (candidate/trainee talking) → 'user'
 *                'assistant' (AI customer/prospect responding) → 'assistant'
 */
const buildConversationMessages = (history) => {
  return history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));
};

/**
 * CRITICAL ROLE FRAMING
 * Prepended to EVERY topic's system_prompt to ensure the AI always behaves
 * as the CUSTOMER / PROSPECT receiving the call — never as the salesperson.
 *
 * Why this is needed:
 * - Topic system_prompts created by company admins may be vague about the role.
 * - AI-generated prompts can sometimes write "You are a sales rep..." by mistake.
 * - This framing is injected first so it is always the dominant instruction.
 */
const CUSTOMER_ROLE_FRAMING = `IMPORTANT ROLE INSTRUCTION:
You are the CUSTOMER / PROSPECT in this conversation.
The person speaking to you (the "user") is a SALES TRAINEE or CANDIDATE practising their pitch.
Your job is to RESPOND AS THE CUSTOMER — raise objections, ask questions, be realistic.
NEVER give sales pitches. NEVER coach or advise the trainee. NEVER switch roles.
You ARE the customer being sold to. Stay fully in character at all times.

`;

const getAIResponse = async (conversationHistory, systemPrompt) => {
  try {
    const messages = buildConversationMessages(conversationHistory);

    // Build the complete system prompt:
    // 1. Customer role framing (always first — prevents role confusion)
    // 2. Topic-specific persona & scenario from the DB
    // 3. Voice brevity directive (always last — keeps responses short for TTS)
    const fullSystemPrompt =
      CUSTOMER_ROLE_FRAMING +
      (systemPrompt || 'You are a realistic business prospect receiving an unsolicited sales call.') +
      '\n\nVOICE FORMAT: This is a real-time spoken conversation. ' +
      'Keep every reply to 1-3 short sentences. No lists, no headers — natural spoken language only.';

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,           // Reduced from 120 → faster generation & TTS
      system: fullSystemPrompt,
      messages,
    });

    return response.content[0].text;
  } catch (err) {
    console.error('Anthropic API error (Chat):', err.message);
    throw err;
  }
};

const evaluateSession = async (conversationHistory, scenarioName) => {
  try {
    const transcript = conversationHistory
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'CANDIDATE' : 'CUSTOMER'}: ${m.content}`)
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
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      messages: [{ role: 'user', content: evaluationPrompt }],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse evaluation response');

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Anthropic API error (Evaluation):', err.message);
    throw err;
  }
};

/**
 * Generate a topic system prompt.
 * Always generates from the CUSTOMER/PROSPECT perspective.
 */
const generateTopicPrompt = async (name, description) => {
  try {
    const prompt = `You are an AI Sales Training Architect.
Create a detailed system prompt for a Voice AI that will role-play as a CUSTOMER / PROSPECT in a sales training session.

TOPIC NAME: ${name}
TOPIC DESCRIPTION: ${description || 'A professional sales interaction.'}

The AI will play the CUSTOMER being called by a sales trainee. Write the prompt in first person ("You are...").
Include:
1. A specific customer persona (name, job title, company size, personality).
2. Their current situation and why they might — or might not — need this product/service.
3. 3-4 realistic objections or hesitations the customer should raise naturally.
4. Behavioral rules: be realistic, slightly sceptical, don't be a pushover, keep replies short for voice.
5. What would make this customer agree to move forward (success criteria for the trainee).

IMPORTANT: The persona is the CUSTOMER receiving the sales call — NOT the salesperson.
Output ONLY the system prompt text. No introductory remarks.`;

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].text;
  } catch (err) {
    console.error('Anthropic API error (Topic Generator):', err.message);
    throw err;
  }
};

module.exports = { getAIResponse, evaluateSession, generateTopicPrompt };
