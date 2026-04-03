const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

/**
 * Generates personalized training recommendations based on candidate's performance data.
 * @param {Object} performanceStats - Average scores { confidence: 75, clarity: 60, ... }
 * @param {Array} availableTopics - List of training scenarios [{ name: "Topic A", category: "Sales", ... }]
 * @param {string} candidateName - Full name of the candidate
 */
const generateRecommendations = async (performanceStats, availableTopics, candidateName) => {
  const statsSummary = Object.entries(performanceStats)
    .map(([skill, score]) => `- ${skill.replace('_', ' ')}: ${score}%`)
    .join('\n');

  const topicsSummary = availableTopics
    .map((t, i) => `${i + 1}. ${t.name} (Category: ${t.category || 'General'}) - ${t.description || 'No description'}`)
    .join('\n');

  const prompt = `You are an AI Sales Development Manager. Analyze the following training data for ${candidateName} and provide exactly 3 specific, prioritized training recommendations.
  
PERFORMANCE STATS:
${statsSummary}

AVAILABLE TRAINING TOPICS:
${topicsSummary}

Respond in exactly this JSON format:
{
  "summary": "Brief 1-sentence overall coaching summary",
  "recommendations": [
    {
      "priority": 1,
      "skill_area": "Skill Name",
      "reasoning": "Why focus here based on stats?",
      "topic_suggestion": "The title of the most relevant topic from the list provided",
      "actionable_tip": "Specific drill or technique to use"
    },
    ... (total of 3)
  ]
}

Focus on the lowest-performing skill areas first. Use the available training topics provided above.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI failed to provide valid recommendations');

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('AI Recommendation Error:', err);
    // Fallback if AI fails
    const skills = Object.entries(performanceStats).sort((a,b) => a[1] - b[1]);
    const lowestSkill = skills[0]?.[0] || 'Sales Skills';
    return {
      summary: `${candidateName} should focus on improving ${lowestSkill?.replace('_', ' ')}.`,
      recommendations: [
        {
          priority: 1,
          skill_area: lowestSkill,
          reasoning: "This area shows the lowest proficiency score.",
          topic_suggestion: availableTopics[0]?.name || "Any Sales Topic",
          actionable_tip: "Review your recent session and practice the intro again."
        }
      ]
    };
  }
};

module.exports = { generateRecommendations };
