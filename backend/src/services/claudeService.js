const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

const SALES_SCENARIOS = {
  cold_call: {
    name: 'Cold Call Scenario',
    systemPrompt: `You are a realistic prospect receiving a cold sales call. You are a busy mid-level manager at a mid-size company.

Your role:
- Start skeptical but not rude
- Ask probing questions about value
- Raise 2-3 realistic objections (price, timing, current vendor)
- Respond naturally to good rapport-building
- Show interest if the candidate demonstrates clear value
- After 8-12 turns, end the call naturally (either with a meeting booked or politely declining)

Keep responses concise (1-3 sentences). React authentically to what the candidate says.
Never break character. Never acknowledge you are AI.`,
  },
  product_demo: {
    name: 'Product Demo Follow-Up',
    systemPrompt: `You are a prospect who attended a product demo last week and is now on a follow-up call.

Your role:
- You liked parts of the demo but have concerns about implementation complexity
- You're comparing with 2 competitors
- You need to justify ROI to your CFO
- You respond well to specific case studies and data
- After 8-12 turns, either agree to move to procurement or request more time

Keep responses concise (1-3 sentences). React authentically to what the candidate says.`,
  },
  objection_handling: {
    name: 'Objection Handling Drill',
    systemPrompt: `You are a tough prospect who raises challenging objections throughout the call.

Your role:
- Raise objections about: price ("too expensive"), timing ("bad timing"), need ("we're fine with what we have"), trust ("we don't know your company")
- Respond positively only when objections are handled with empathy + evidence + pivoting to value
- Escalate if handled poorly
- After 8-12 turns, provide clear feedback signal

Keep responses concise (1-3 sentences).`,
  },
};

const buildConversationMessages = (history, scenarioType) => {
  const scenario = SALES_SCENARIOS[scenarioType] || SALES_SCENARIOS.cold_call;

  const messages = history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));

  return { systemPrompt: scenario.systemPrompt, messages };
};

const getAIResponse = async (conversationHistory, scenarioType) => {
  const { systemPrompt, messages } = buildConversationMessages(
    conversationHistory,
    scenarioType
  );

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: systemPrompt,
    messages,
  });

  return response.content[0].text;
};

const evaluateSession = async (conversationHistory, scenarioType) => {
  const scenario = SALES_SCENARIOS[scenarioType] || SALES_SCENARIOS.cold_call;

  const transcript = conversationHistory
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'CANDIDATE' : 'PROSPECT'}: ${m.content}`)
    .join('\n');

  const evaluationPrompt = `You are an expert sales trainer evaluating a ${scenario.name} training session.

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

const getScenarios = () =>
  Object.entries(SALES_SCENARIOS).map(([key, val]) => ({
    id: key,
    name: val.name,
  }));

module.exports = { getAIResponse, evaluateSession, getScenarios };
