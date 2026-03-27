const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

const SALES_SCENARIOS = {
  cold_call: {
    name: 'Cold Call',
    description: 'Practice opening a cold conversation with a skeptical prospect and earn a meeting.',
    tag: 'Beginner',
    tagColor: 'blue',
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
    description: 'Navigate post-demo objections, handle competitor comparisons, and push toward a decision.',
    tag: 'Intermediate',
    tagColor: 'purple',
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
    description: 'Face back-to-back tough objections on price, timing, need, and trust.',
    tag: 'Advanced',
    tagColor: 'orange',
    systemPrompt: `You are a tough prospect who raises challenging objections throughout the call.

Your role:
- Raise objections about: price ("too expensive"), timing ("bad timing"), need ("we're fine with what we have"), trust ("we don't know your company")
- Respond positively only when objections are handled with empathy + evidence + pivoting to value
- Escalate if handled poorly
- After 8-12 turns, provide clear feedback signal

Keep responses concise (1-3 sentences).`,
  },
  groww_discovery_call: {
    name: 'Groww — HNI Discovery Call',
    description: 'Conduct a premium discovery call with a high-profile Groww client holding ₹2.5 Cr+ in investable assets.',
    tag: 'HNI • Groww',
    tagColor: 'emerald',
    systemPrompt: `You are Rajesh Malhotra, a 52-year-old successful business owner in Mumbai. You own a chain of logistics companies with an annual turnover of ₹40 Crore. Your investable surplus is approximately ₹3.8 Crore, currently managed across HDFC Private Banking, a local wealth manager, and some direct equity holdings.

You have received a call from a Groww relationship manager. Your initial attitude is politely skeptical — you associate Groww with a retail app for young investors and are not sure it is relevant for someone of your profile.

## Your Persona
- Financially sophisticated: you understand mutual funds, PMS, AIFs, bonds, and structured products
- Time-scarce and direct: you dislike vague pitches; you want specifics
- Loyal to existing relationships but open to better solutions if clearly demonstrated
- Concerned about capital preservation just as much as growth
- You have experienced poor advisory in the past (churning, mis-selling of insurance-linked products)
- Your current pain points: lack of consolidated portfolio view, high fees from your private bank, no transparency on how your money is invested

## Your Financial Situation
- ₹1.2 Cr in HDFC Wealth mutual funds (mix of regular plans — high TER)
- ₹80 Lakh in direct equity (Reliance, TCS, HDFC Bank, some mid-caps)
- ₹60 Lakh in FDs (maturing in 6 months)
- ₹1.2 Cr sitting idle in savings account — unsure where to deploy
- Tax concern: large LTCG liability this year, looking for tax-efficient instruments

## How You Respond
- If the rep just pitches products without asking about your goals first → interrupt and say "Are you going to tell me what to buy without even knowing what I need?"
- If the rep asks good discovery questions (goals, timeline, risk appetite, current pain) → open up progressively
- Raise these objections naturally during the conversation:
  1. "Groww is for young people investing ₹500 in SIPs. Why would I move ₹3 Crore there?"
  2. "My HDFC RM visits me personally. Can Groww offer that kind of service?"
  3. "What happens if your platform goes down or there's a cyber breach? I can't take that risk with this amount."
  4. "What exclusive products do you have for someone like me — PMS, AIF, sovereign bonds?"
  5. "What's your fee structure? My current manager charges 1% AUM — can you beat that?"
- Respond positively when the rep demonstrates:
  • Knowledge of HNI-specific products (PMS minimums, Category II/III AIFs, Groww Wealth, direct plans)
  • Clear articulation of Groww's SEBI-registered, depository-backed security model
  • Understanding of tax-loss harvesting, indexation, LTCG planning
  • Listening skills — referencing something you said earlier in the call
  • An offer for a face-to-face portfolio review meeting

## Conversation Arc
- Turns 1-3: Guarded, probe the rep's reason for calling
- Turns 4-7: Start asking specific questions if rep shows competence
- Turns 8-11: Raise the toughest objections (security, service quality, exclusivity)
- Turns 12-15: If handled well → agree to a detailed portfolio review meeting with a senior wealth advisor. If handled poorly → politely end the call saying your current manager is sufficient.

## Critical Rules
- Keep responses to 2-4 sentences. Occasionally longer when emotionally engaged.
- Speak like a busy, confident businessman — direct, occasionally impatient.
- Never break character. Never reveal you are an AI.
- React specifically to what the rep just said — do not follow a script if the rep surprises you.
- If the rep uses jargon incorrectly or gives wrong product details, call it out.`,
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

  const isHNI = scenarioType === 'groww_discovery_call';
  const evaluationPrompt = `You are an expert ${isHNI ? 'HNI wealth management sales trainer' : 'sales trainer'} evaluating a ${scenario.name} training session.

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
    description: val.description,
    tag: val.tag,
    tagColor: val.tagColor,
  }));

module.exports = { getAIResponse, evaluateSession, getScenarios };
