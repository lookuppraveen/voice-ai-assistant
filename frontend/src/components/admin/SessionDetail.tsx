'use client';

import { SessionWithBreakdown, Message, ImprovementSuggestion } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
// Using native date formatting

interface SessionDetailProps {
  session: SessionWithBreakdown;
  messages: Message[];
}

const scoreLabel = (score: number) =>
  score >= 80 ? 'success' : score >= 60 ? 'info' : score >= 40 ? 'warning' : 'danger';

export const SessionDetail = ({ session, messages }: SessionDetailProps) => {
  const suggestions: ImprovementSuggestion[] = Array.isArray(session.improvement_suggestions)
    ? session.improvement_suggestions
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Session Overview</CardTitle>
            <Badge variant={session.status === 'completed' ? 'success' : 'warning'}>
              {session.status}
            </Badge>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Overall Score', value: session.score ?? '—' },
            { label: 'Scenario', value: session.scenario_type?.replace('_', ' ') },
            { label: 'Duration', value: session.duration_seconds ? `${Math.round(session.duration_seconds / 60)}m` : '—' },
            { label: 'Turns', value: messages.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      {session.score != null && (
        <Card>
          <CardHeader><CardTitle>Score Breakdown</CardTitle></CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              ['Confidence', session.confidence_score],
              ['Clarity', session.clarity_score],
              ['Objection Handling', session.objection_handling_score],
              ['Closing Technique', session.closing_technique_score],
              ['Product Knowledge', session.product_knowledge_score],
              ['Rapport', session.rapport_score],
            ].map(([label, val]) => (
              <div key={label as string} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-gray-900">{val ?? '—'}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {session.ai_feedback && (
        <Card>
          <CardHeader><CardTitle>AI Feedback</CardTitle></CardHeader>
          <p className="text-sm text-gray-700">{session.ai_feedback}</p>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Improvement Suggestions</CardTitle></CardHeader>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                <p className="font-semibold text-sm text-blue-700">{s.area}</p>
                <p className="text-sm text-gray-700 mt-1">{s.suggestion}</p>
                <p className="text-xs text-gray-400 italic mt-1">e.g. &quot;{s.example}&quot;</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card padding="none">
        <div className="p-6 border-b border-gray-100">
          <CardTitle>Transcript ({messages.length} turns)</CardTitle>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] text-sm px-4 py-2 rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                <p className="text-xs opacity-70 font-semibold mb-1">
                  {m.role === 'user' ? 'Candidate' : 'Prospect'}
                </p>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
