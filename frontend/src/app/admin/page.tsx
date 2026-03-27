'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { clearAuth, getStoredUser } from '@/lib/auth';
import { AdminStats, CandidateWithStats } from '@/types';
import { CandidateTable } from '@/components/admin/CandidateTable';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Logo } from '@/components/ui/Logo';
import {
  Users, BarChart2, Star, LogOut, TrendingUp,
  Activity, Search, ChevronRight, Award, X,
  Clock, Calendar, Filter, Eye,
} from 'lucide-react';

type Tab = 'overview' | 'candidates' | 'sessions';

interface DashboardData {
  stats: AdminStats;
  recent_sessions: any[];
  score_distribution: { band: string; count: number }[];
}

const SCORE_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  excellent:        { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-400/10' },
  good:             { bar: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-400/10'       },
  average:          { bar: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-400/10'     },
  needs_improvement:{ bar: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-400/10'         },
};

const SCENARIO_LABELS: Record<string, string> = {
  cold_call:            'Cold Call',
  product_demo:         'Product Demo',
  objection_handling:   'Objection Handling',
  groww_discovery_call: 'Groww HNI Discovery',
};

function scoreStyle(score: number | null) {
  if (score == null) return 'text-gray-400 dark:text-slate-500';
  if (score >= 80) return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10';
  if (score >= 60) return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/10';
  return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-400/10';
}

// ─── Candidate Detail Drawer ──────────────────────────────────────────────────
function CandidateDrawer({ candidateId, onClose }: { candidateId: string; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.candidateSessions(candidateId)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [candidateId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          {loading ? (
            <div className="h-5 w-40 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
          ) : (
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-lg">{data?.candidate.full_name}</p>
              <p className="text-gray-500 dark:text-slate-400 text-sm">{data?.candidate.email}</p>
            </div>
          )}
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Stats row */}
        {!loading && data && (
          <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-800 shrink-0">
            {[
              { label: 'Sessions', value: data.sessions.length },
              { label: 'Avg Score', value: data.sessions.filter((s:any) => s.score != null).length
                  ? Math.round(data.sessions.filter((s:any) => s.score != null).reduce((a:number,s:any) => a + s.score, 0) / data.sessions.filter((s:any) => s.score != null).length)
                  : '—' },
              { label: 'Department', value: data.candidate.department || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-slate-900 px-4 py-3 text-center">
                <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))
          ) : data?.sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Activity className="h-8 w-8 text-gray-300 dark:text-slate-600" />
              <p className="text-gray-400 dark:text-slate-500 text-sm">No sessions yet</p>
            </div>
          ) : (
            data.sessions.map((s: any) => {
              const sc = s.score != null ? Math.round(s.score) : null;
              return (
                <div key={s.id} className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {SCENARIO_LABELS[s.scenario_type] || s.scenario_type}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(s.started_at).toLocaleDateString()}
                      </span>
                      {s.duration_seconds && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                          <Clock className="h-3 w-3" />
                          {Math.round(s.duration_seconds / 60)}m
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {sc != null && (
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${scoreStyle(sc)}`}>{sc}</span>
                    )}
                    {s.status === 'completed' && (
                      <button
                        onClick={() => router.push(`/session/${s.id}`)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-indigo-400 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-gray-500 dark:text-slate-300" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────
function SessionsTab() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scenarioFilter, setScenarioFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetch = useCallback(() => {
    setLoading(true);
    adminApi.sessions(page, LIMIT, scenarioFilter, statusFilter)
      .then(res => { setSessions(res.data.sessions); setTotal(res.data.total); })
      .finally(() => setLoading(false));
  }, [page, scenarioFilter, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
          <Filter className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
          <select
            value={scenarioFilter}
            onChange={e => { setScenarioFilter(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 dark:text-slate-200 bg-transparent focus:outline-none"
          >
            <option value="">All Scenarios</option>
            {Object.entries(SCENARIO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
          <Filter className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 dark:text-slate-200 bg-transparent focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
        <span className="ml-auto text-sm text-gray-400 dark:text-slate-500">{total} total sessions</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-800">
              {['Candidate', 'Scenario', 'Date', 'Duration', 'Score', 'Status', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider bg-gray-50 dark:bg-slate-800/50">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-gray-400 dark:text-slate-500 text-sm">
                  No sessions found
                </td>
              </tr>
            ) : (
              sessions.map(s => {
                const sc = s.score != null ? Math.round(s.score) : null;
                const statusColors: Record<string, string> = {
                  completed:   'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20',
                  in_progress: 'bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-400/20',
                  abandoned:   'bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700',
                };
                return (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {s.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-200">{s.full_name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-700 dark:text-slate-300">
                        {SCENARIO_LABELS[s.scenario_type] || s.scenario_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-slate-400">
                      {new Date(s.started_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-slate-400">
                      {s.duration_seconds ? `${Math.round(s.duration_seconds / 60)}m` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {sc != null ? (
                        <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-lg ${scoreStyle(sc)}`}>{sc}</span>
                      ) : <span className="text-gray-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusColors[s.status] ?? ''}`}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {s.status === 'completed' && (
                        <button
                          onClick={() => router.push(`/session/${s.id}`)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-all bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700"
                        >
                          View <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-slate-400">
              Page {page} of {Math.ceil(total / LIMIT)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >Previous</button>
              <button
                disabled={page >= Math.ceil(total / LIMIT)}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Candidates Tab ───────────────────────────────────────────────────────────
function CandidatesTab() {
  const [candidates, setCandidates] = useState<CandidateWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    adminApi.candidates(1, 50, '').then(res => setCandidates(res.data.candidates)).finally(() => setLoading(false));
  }, []);

  const handleSearch = async (q: string) => {
    setSearch(q);
    const res = await adminApi.candidates(1, 50, q);
    setCandidates(res.data.candidates);
  };

  const handleToggle = async (id: string) => {
    await adminApi.toggleStatus(id);
    const res = await adminApi.candidates(1, 50, search);
    setCandidates(res.data.candidates);
  };

  return (
    <>
      {selectedId && <CandidateDrawer candidateId={selectedId} onClose={() => setSelectedId(null)} />}

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold text-base">All Candidates</h2>
            <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5">{candidates.length} registered</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-8 w-8 text-gray-300 dark:text-slate-600" />
            <p className="text-gray-400 dark:text-slate-500 text-sm">No candidates found</p>
          </div>
        ) : (
          <CandidateTable
            candidates={candidates}
            onToggleStatus={handleToggle}
            onViewSessions={setSelectedId}
          />
        )}
      </div>
    </>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ data, onNavigate }: { data: DashboardData; onNavigate: (tab: Tab) => void }) {
  const router = useRouter();
  const totalInDist = data.score_distribution?.reduce((s, d) => s + d.count, 0) || 1;
  const avgScore = data.stats.average_score ? Math.round(data.stats.average_score) : null;
  const sc = avgScore == null ? 'text-gray-400 dark:text-slate-500'
    : avgScore >= 80 ? 'text-emerald-600 dark:text-emerald-400'
    : avgScore >= 60 ? 'text-blue-600 dark:text-blue-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div onClick={() => onNavigate('candidates')} className="cursor-pointer bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700/50 transition-colors shadow-sm group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 dark:from-indigo-600/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <TrendingUp className="h-4 w-4 text-gray-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{data.stats.total_candidates ?? 0}</p>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 font-medium">Total Candidates</p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View all →</p>
          </div>
        </div>

        <div onClick={() => onNavigate('sessions')} className="cursor-pointer bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-colors shadow-sm group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 dark:from-emerald-600/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-600/20 flex items-center justify-center">
                <BarChart2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Activity className="h-4 w-4 text-gray-300 dark:text-slate-600 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{data.stats.total_sessions ?? 0}</p>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 font-medium">Sessions Completed</p>
            <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View all →</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden hover:border-amber-300 dark:hover:border-amber-700/50 transition-colors shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 dark:from-amber-600/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-600/20 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <Award className="h-4 w-4 text-gray-300 dark:text-slate-600" />
            </div>
            <p className={`text-3xl font-extrabold ${sc}`}>{avgScore ?? '—'}</p>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 font-medium">Average Score</p>
          </div>
        </div>
      </div>

      {/* Score Distribution + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data.score_distribution?.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-gray-900 dark:text-white font-semibold text-base mb-5">Score Distribution</h2>
            <div className="space-y-4">
              {data.score_distribution.map(d => {
                const pct = Math.round((d.count / totalInDist) * 100);
                const c = SCORE_COLORS[d.band] ?? { bar: 'bg-gray-400', text: 'text-gray-600 dark:text-slate-300', bg: 'bg-gray-100 dark:bg-slate-800' };
                return (
                  <div key={d.band}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${c.text} ${c.bg}`}>
                        {d.band.replace('_', ' ')}
                      </span>
                      <span className="text-gray-400 dark:text-slate-500 text-xs">{d.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.recent_sessions?.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-gray-900 dark:text-white font-semibold text-base">Recent Sessions</h2>
              <button onClick={() => onNavigate('sessions')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">View all</button>
            </div>
            <div className="space-y-1">
              {data.recent_sessions.map(s => {
                const sc2 = Number(s.score);
                const ss = sc2 >= 80
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10'
                  : sc2 >= 60 ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/10'
                  : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-400/10';
                return (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group" onClick={() => router.push(`/session/${s.id}`)}>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-200 dark:from-slate-600 to-gray-300 dark:to-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300 text-xs font-bold shrink-0">
                      {s.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-slate-200 text-sm font-medium truncate">{s.full_name}</p>
                      <p className="text-gray-400 dark:text-slate-500 text-xs capitalize">{SCENARIO_LABELS[s.scenario_type] || s.scenario_type}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${ss}`}>{s.score}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role === 'candidate') { router.push('/dashboard'); return; }
    adminApi.stats()
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [router]);

  const logout = () => { clearAuth(); router.push('/login'); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-gray-200 dark:border-slate-700" />
            <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-t-indigo-500 animate-spin" />
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm font-medium tracking-wide">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const TAB_CONFIG: { id: Tab; icon: any; label: string }[] = [
    { id: 'overview',   icon: BarChart2, label: 'Overview'   },
    { id: 'candidates', icon: Users,     label: 'Candidates' },
    { id: 'sessions',   icon: Activity,  label: 'Sessions'   },
  ];

  const PAGE_TITLES: Record<Tab, string> = {
    overview:   'Supervisor Dashboard',
    candidates: 'Candidates',
    sessions:   'All Sessions',
  };

  const PAGE_SUB: Record<Tab, string> = {
    overview:   'Monitor candidate performance & sessions',
    candidates: 'Manage and review all registered candidates',
    sessions:   'Browse and filter all training sessions',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex transition-colors duration-300">

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0 transition-colors duration-300">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-800">
          <div className="bg-white rounded-xl px-3 py-2 shadow-sm dark:shadow-none">
            <Logo theme="light" className="h-9 w-auto" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TAB_CONFIG.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600/30'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Appearance</span>
          <ThemeToggle />
        </div>

        {/* User */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.full_name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 dark:text-slate-200 text-xs font-semibold truncate">{user?.full_name ?? 'Admin'}</p>
              <p className="text-gray-500 dark:text-slate-500 text-xs capitalize">{user?.role}</p>
            </div>
            <button onClick={logout} title="Logout" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <LogOut className="h-3.5 w-3.5 text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-900/50 backdrop-blur border-b border-gray-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300">
          <div>
            <h1 className="text-gray-900 dark:text-white font-bold text-xl">{PAGE_TITLES[activeTab]}</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">{PAGE_SUB[activeTab]}</p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600/30 text-xs rounded-full font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </header>

        <main className="px-8 py-8">
          {activeTab === 'overview'   && data && <OverviewTab data={data} onNavigate={setActiveTab} />}
          {activeTab === 'candidates' && <CandidatesTab />}
          {activeTab === 'sessions'   && <SessionsTab />}
        </main>
      </div>
    </div>
  );
}
