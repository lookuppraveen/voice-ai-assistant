'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { sessionsApi } from '@/lib/api';
import { SessionWithBreakdown, Message, Evaluation } from '@/types';
import { ScoreCard } from '@/components/session/ScoreCard';
import Button from '@/components/ui/Button';
import { ArrowLeft, RotateCcw, LayoutDashboard, Mic } from 'lucide-react';

export default function SessionReviewPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionWithBreakdown | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    sessionsApi
      .get(sessionId)
      .then((res) => {
        setSession(res.data.session);
        setMessages(res.data.messages);
      })
      .catch(() => setError('Session not found'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-400 text-sm animate-pulse">Loading your results...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Session Not Found</h2>
          <p className="text-gray-400 text-sm mb-6">{error || 'This session could not be loaded.'}</p>
          <Button onClick={() => router.push('/dashboard')}>
            <LayoutDashboard className="h-4 w-4 mr-2" /> Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const evaluation: Evaluation | null =
    session.score != null
      ? {
          overall_score: session.score,
          breakdown: {
            confidence: (session as any).confidence_score ?? 0,
            clarity: (session as any).clarity_score ?? 0,
            objection_handling: (session as any).objection_handling_score ?? 0,
            closing_technique: (session as any).closing_technique_score ?? 0,
            product_knowledge: (session as any).product_knowledge_score ?? 0,
            rapport_building: (session as any).rapport_score ?? 0,
          },
          strengths: Array.isArray(session.strengths) ? session.strengths : [],
          weaknesses: Array.isArray(session.weaknesses) ? session.weaknesses : [],
          improvement_suggestions: Array.isArray(session.improvement_suggestions)
            ? session.improvement_suggestions
            : [],
          summary: session.ai_feedback || '',
        }
      : null;

  return (
    <div className="min-h-screen bg-gray-950">

      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-white/5 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-blue-400" />
            <span className="text-white font-semibold text-sm">VoiceCoach AI</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="ghost"
              onClick={() => router.push(`/session?scenario=${session.scenario_type}`)}
              className="text-gray-400 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Retry
            </Button>
            <Button
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" /> Dashboard
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {evaluation ? (
          <ScoreCard
            evaluation={evaluation}
            messages={messages}
            scenarioType={session.scenario_type}
            duration={session.duration_seconds ?? undefined}
          />
        ) : (
          /* Session incomplete / no score yet */
          <div className="bg-gray-900 rounded-3xl border border-white/5 p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📊</span>
            </div>
            <h2 className="text-white font-bold text-lg mb-2">No Score Yet</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
              This session hasn&apos;t been evaluated yet. Complete a session by clicking
              &ldquo;End &amp; Score&rdquo; to get your AI-powered review.
            </p>
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </div>
        )}
      </main>
    </div>
  );
}
