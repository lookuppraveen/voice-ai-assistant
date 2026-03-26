'use client';

import { useState, useEffect } from 'react';
import { Evaluation } from '@/types';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  CheckCircle, XCircle, Lightbulb, TrendingUp,
  Target, BookOpen, Users, Zap, Award,
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Score Ring ────────────────────────────────────────────────────────────────
const ScoreRing = ({ score }: { score: number }) => {
  const [animated, setAnimated] = useState(0);
  const radius = 72;
  const stroke = 10;
  const normalised = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalised;
  const offset = circumference - (animated / 100) * circumference;

  const color =
    score >= 80 ? '#22c55e' :
    score >= 60 ? '#3b82f6' :
    score >= 40 ? '#f59e0b' : '#ef4444';

  const grade =
    score >= 80 ? 'Excellent' :
    score >= 60 ? 'Good' :
    score >= 40 ? 'Average' : 'Needs Work';

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          {/* Track */}
          <circle cx="80" cy="80" r={normalised} fill="none"
            stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
          {/* Progress */}
          <circle cx="80" cy="80" r={normalised} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-white leading-none">{score}</span>
          <span className="text-xs text-gray-400 mt-1">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold px-3 py-1 rounded-full"
        style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}44` }}>
        {grade}
      </span>
    </div>
  );
};

// ─── Animated Metric Bar ────────────────────────────────────────────────────────
const MetricBar = ({ label, value, icon, delay = 0 }: {
  label: string; value: number; icon: React.ReactNode; delay?: number;
}) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 200 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  const color =
    value >= 80 ? 'from-green-500 to-emerald-400' :
    value >= 60 ? 'from-blue-500 to-indigo-400' :
    value >= 40 ? 'from-amber-500 to-yellow-400' :
    'from-red-500 to-rose-400';

  const textColor =
    value >= 80 ? 'text-green-400' :
    value >= 60 ? 'text-blue-400' :
    value >= 40 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm text-gray-300">{label}</span>
          <span className={clsx('text-sm font-bold', textColor)}>{value}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full bg-gradient-to-r', color)}
            style={{
              width: `${width}%`,
              transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Tab Button ────────────────────────────────────────────────────────────────
const Tab = ({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={clsx(
      'px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
      active
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-400 hover:text-white hover:bg-white/10'
    )}
  >
    {label}
  </button>
);

// ─── Transcript Bubble ─────────────────────────────────────────────────────────
const Bubble = ({ role, content, turn }: {
  role: 'user' | 'assistant'; content: string; turn: number;
}) => {
  const isUser = role === 'user';
  return (
    <div className={clsx('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold',
        isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
      )}>
        {isUser ? 'Y' : 'P'}
      </div>
      <div className={clsx(
        'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-blue-600 text-white rounded-tr-sm'
          : 'bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700'
      )}>
        <p className="text-[10px] font-semibold opacity-60 mb-1 uppercase tracking-wide">
          {isUser ? 'You' : 'Prospect'} · Turn {turn}
        </p>
        {content}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────
interface ScoreCardProps {
  evaluation: Evaluation;
  messages?: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string; turn_number: number }>;
  scenarioType?: string;
  duration?: number;
}

const metricIcons = [
  <Zap key="z" className="h-4 w-4 text-yellow-400" />,
  <Target key="t" className="h-4 w-4 text-blue-400" />,
  <Users key="u" className="h-4 w-4 text-purple-400" />,
  <TrendingUp key="tr" className="h-4 w-4 text-green-400" />,
  <BookOpen key="b" className="h-4 w-4 text-orange-400" />,
  <Award key="a" className="h-4 w-4 text-pink-400" />,
];

export const ScoreCard = ({ evaluation, messages = [], scenarioType, duration }: ScoreCardProps) => {
  const [tab, setTab] = useState<'overview' | 'breakdown' | 'coaching' | 'transcript'>('overview');

  const radarData = [
    { subject: 'Confidence', value: evaluation.breakdown.confidence },
    { subject: 'Clarity', value: evaluation.breakdown.clarity },
    { subject: 'Objections', value: evaluation.breakdown.objection_handling },
    { subject: 'Closing', value: evaluation.breakdown.closing_technique },
    { subject: 'Knowledge', value: evaluation.breakdown.product_knowledge },
    { subject: 'Rapport', value: evaluation.breakdown.rapport_building },
  ];

  const metrics = [
    { label: 'Confidence', value: evaluation.breakdown.confidence },
    { label: 'Clarity', value: evaluation.breakdown.clarity },
    { label: 'Objection Handling', value: evaluation.breakdown.objection_handling },
    { label: 'Closing Technique', value: evaluation.breakdown.closing_technique },
    { label: 'Product Knowledge', value: evaluation.breakdown.product_knowledge },
    { label: 'Rapport Building', value: evaluation.breakdown.rapport_building },
  ];

  const conversationMessages = messages.filter(m => m.role !== 'system');

  return (
    <div className="bg-gray-950 rounded-3xl overflow-hidden shadow-2xl border border-white/5">

      {/* ── Hero Header ──────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 px-8 pt-10 pb-8 overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <ScoreRing score={evaluation.overall_score} />

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="text-xs font-medium text-blue-400 uppercase tracking-widest">
                Session Complete
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mb-3 capitalize">
              {scenarioType ? scenarioType.replace(/_/g, ' ') : 'Training'} Review
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed max-w-lg">
              {evaluation.summary}
            </p>

            {/* meta pills */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
              {duration && (
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300">
                  ⏱ {Math.round(duration / 60)}m {duration % 60}s
                </span>
              )}
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300">
                💬 {conversationMessages.length} turns
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300">
                📊 {metrics.filter(m => m.value >= 60).length}/{metrics.length} metrics above 60
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative mt-8 flex gap-1 p-1 bg-white/5 rounded-xl w-fit mx-auto md:mx-0">
          {(['overview', 'breakdown', 'coaching', 'transcript'] as const).map(t => (
            <Tab key={t} label={t.charAt(0).toUpperCase() + t.slice(1)}
              active={tab === t} onClick={() => setTab(t)} />
          ))}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <div className="p-6 md:p-8">

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Radar + quick metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900 rounded-2xl p-5 border border-white/5">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Performance Radar
                </h3>
                <ResponsiveContainer width="100%" height={230}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                    />
                    <Radar name="Score" dataKey="value"
                      stroke="#6366f1" fill="#6366f1" fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                      labelStyle={{ color: '#e5e7eb' }}
                      itemStyle={{ color: '#818cf8' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-900 rounded-2xl p-5 border border-white/5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Quick Scores
                </h3>
                {metrics.map((m, i) => (
                  <MetricBar key={m.label} label={m.label} value={m.value}
                    icon={metricIcons[i]} delay={i * 80} />
                ))}
              </div>
            </div>

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-gradient-to-br from-green-950/60 to-gray-900 rounded-2xl p-5 border border-green-900/40">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-green-300 text-sm">What You Did Well</h3>
                </div>
                <ul className="space-y-3">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-br from-red-950/60 to-gray-900 rounded-2xl p-5 border border-red-900/40">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-400" />
                  </div>
                  <h3 className="font-semibold text-red-300 text-sm">Areas to Improve</h3>
                </div>
                <ul className="space-y-3">
                  {evaluation.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <XCircle className="h-3 w-3 text-red-400" />
                      </span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* BREAKDOWN TAB */}
        {tab === 'breakdown' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm mb-6">
              Detailed score for each evaluated skill dimension.
            </p>
            {metrics.map((m, i) => {
              const color =
                m.value >= 80 ? { bg: 'bg-green-500/10', border: 'border-green-800/40', text: 'text-green-400', bar: 'from-green-500 to-emerald-400' } :
                m.value >= 60 ? { bg: 'bg-blue-500/10', border: 'border-blue-800/40', text: 'text-blue-400', bar: 'from-blue-500 to-indigo-400' } :
                m.value >= 40 ? { bg: 'bg-amber-500/10', border: 'border-amber-800/40', text: 'text-amber-400', bar: 'from-amber-500 to-yellow-400' } :
                { bg: 'bg-red-500/10', border: 'border-red-800/40', text: 'text-red-400', bar: 'from-red-500 to-rose-400' };

              return (
                <div key={m.label} className={clsx('rounded-2xl p-5 border', color.bg, color.border)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                        {metricIcons[i]}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{m.label}</p>
                        <p className="text-xs text-gray-500">
                          {m.value >= 80 ? 'Strong' : m.value >= 60 ? 'Developing' : m.value >= 40 ? 'Needs Focus' : 'Critical Gap'}
                        </p>
                      </div>
                    </div>
                    <span className={clsx('text-3xl font-black', color.text)}>{m.value}</span>
                  </div>
                  <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full bg-gradient-to-r', color.bar)}
                      style={{ width: `${m.value}%`, transition: 'width 1s ease' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* COACHING TAB */}
        {tab === 'coaching' && (
          <div>
            <p className="text-gray-400 text-sm mb-6">
              Personalised coaching steps based on your session performance.
            </p>
            <div className="space-y-5">
              {evaluation.improvement_suggestions.map((item, i) => (
                <div key={i} className="relative pl-12">
                  {/* Step number */}
                  <div className="absolute left-0 top-0 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600
                    flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/20">
                    {i + 1}
                  </div>
                  {/* connector */}
                  {i < evaluation.improvement_suggestions.length - 1 && (
                    <div className="absolute left-4 top-8 w-0.5 h-full bg-gradient-to-b from-indigo-600/40 to-transparent" />
                  )}

                  <div className="bg-gray-900 rounded-2xl p-5 border border-white/5 hover:border-indigo-500/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                      <span className="text-sm font-bold text-indigo-300">{item.area}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed mb-3">{item.suggestion}</p>
                    <div className="bg-gray-800/80 rounded-xl p-3 border border-white/5">
                      <p className="text-xs text-gray-500 font-medium mb-1">TRY SAYING:</p>
                      <p className="text-sm text-gray-300 italic">&ldquo;{item.example}&rdquo;</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRANSCRIPT TAB */}
        {tab === 'transcript' && (
          <div>
            {conversationMessages.length === 0 ? (
              <p className="text-center text-gray-500 py-16">No transcript available.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-gray-400 text-sm">
                    {conversationMessages.length} messages in this session
                  </p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> You
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-700 inline-block" /> Prospect
                    </span>
                  </div>
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-hide">
                  {conversationMessages.map((m) => (
                    <Bubble key={m.id} role={m.role as 'user' | 'assistant'}
                      content={m.content} turn={m.turn_number} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
