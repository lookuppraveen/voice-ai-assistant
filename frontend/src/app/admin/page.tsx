'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, topicsApi } from '@/lib/api';
import { clearAuth, getStoredUser } from '@/lib/auth';
import { AdminStats, CandidateWithStats } from '@/types';
import { CandidateTable } from '@/components/admin/CandidateTable';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Logo } from '@/components/ui/Logo';
import {
  Users, BarChart2, Star, LogOut, TrendingUp,
  Activity, Search, ChevronRight, Award, X,
  Clock, Calendar, Filter, Eye, ShieldCheck, UserPlus, Copy,
  BookOpen, Edit2, Trash2, Plus
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, BarChart, Bar, Cell 
} from 'recharts';

type Tab = 'overview' | 'candidates' | 'sessions' | 'users' | 'topics' | 'reports';

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
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.candidateSessions(candidateId),
      adminApi.candidateRecommendations(candidateId)
    ]).then(([sessionsRes, recRes]) => {
      setData(sessionsRes.data);
      setRecommendations(recRes.data);
    }).finally(() => setLoading(false));
  }, [candidateId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
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

        {/* Content list */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* AI Coaching Section */}
          {!loading && recommendations && recommendations.recommendations?.length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-800/50 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  AI Coaching Insights
                </h3>
              </div>
              
              <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium leading-relaxed italic">
                "{recommendations.summary}"
              </p>

              <div className="space-y-4 pt-2">
                {recommendations.recommendations.map((rec: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-slate-900/50 rounded-xl p-4 border border-indigo-50 dark:border-indigo-800/20 shadow-sm transition-all hover:shadow-md group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Priority {rec.priority}
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {rec.skill_area}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-slate-400 leading-relaxed mb-3">
                      {rec.reasoning}
                    </p>
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-2.5 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tighter mb-1">Recommended Training</p>
                      <p className="text-xs font-bold text-gray-900 dark:text-white mb-1.5">{rec.topic_suggestion}</p>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium leading-normal bg-indigo-50/50 dark:bg-indigo-900/30 p-1.5 rounded border border-indigo-100/50 dark:border-indigo-800/30">
                        💡 {rec.actionable_tip}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">Session History</h3>
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
                  <div key={s.id} className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between gap-3 group">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-indigo-600 transition-colors">
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
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-indigo-400 transition-colors shadow-sm"
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
        <select
          value={scenarioFilter}
          onChange={e => { setScenarioFilter(e.target.value); setPage(1); }}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
        >
          <option value="">All Scenarios</option>
          {Object.entries(SCENARIO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="abandoned">Abandoned</option>
        </select>
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', full_name: '', department: '', role: 'candidate' });
  const [addLoading, setAddLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [addedUser, setAddedUser] = useState<{ email: string; tempPassword: string } | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<any[] | null>(null);
  const [comparing, setComparing] = useState(false);

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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const { companyApi } = await import('@/lib/api');
      const resAuth = await companyApi.inviteUser({ ...addForm, role: 'candidate' });
      setToast('Candidate invited successfully!');
      
      const res = await adminApi.candidates(1, 50, search);
      setCandidates(res.data.candidates);

      setAddedUser({
        email: addForm.email,
        tempPassword: resAuth.data.tempPassword,
      });

      setAddForm({ email: '', full_name: '', department: '', role: 'candidate' });
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      setToast(err.response?.data?.error || 'Failed to invite candidate');
      setTimeout(() => setToast(null), 4000);
    } finally {
      setAddLoading(false);
    }
  };

  const handleCompare = async () => {
    if (selectedForCompare.length < 2) return;
    setComparing(true);
    try {
      const res = await adminApi.comparisonReport(selectedForCompare);
      setCompareData(res.data.comparison);
    } catch (err) {
      setToast('Failed to load comparison data');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setComparing(false);
    }
  };

  return (
    <>
      {toast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700">
          {toast}
        </div>
      )}
      {selectedId && <CandidateDrawer candidateId={selectedId} onClose={() => setSelectedId(null)} />}

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold text-base">All Candidates</h2>
            <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5">{candidates.length} registered</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedForCompare.length >= 2 && (
              <button
                onClick={handleCompare}
                disabled={comparing}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all disabled:opacity-50"
              >
                {comparing ? 'Loading...' : `Compare ${selectedForCompare.length} Selected`}
              </button>
            )}
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
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Invite Candidate
            </button>
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
            selectedIds={selectedForCompare}
            onSelectionChange={setSelectedForCompare}
          />
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex justify-center items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setAddedUser(null); }} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 transform border border-gray-200 dark:border-slate-800">
            {addedUser ? (
              <div className="text-center">
                <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Candidate Added!</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                  An email has been dispatched. If it gets blocked by spam filters, you can securely share these temporary credentials manually:
                </p>
                
                <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-left border border-gray-200 dark:border-slate-700 mb-6">
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Login Email</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{addedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Temporary Password</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                        {addedUser.tempPassword}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(addedUser.tempPassword)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Copy password"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { setShowAddModal(false); setAddedUser(null); }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Invite New Candidate</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text" required
                      value={addForm.full_name}
                      onChange={e => setAddForm({ ...addForm, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                    <input
                      type="email" required
                      value={addForm.email}
                      onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Department (Optional)</label>
                    <input
                      type="text"
                      value={addForm.department}
                      onChange={e => setAddForm({ ...addForm, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Sales (Americas)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Role</label>
                    <select
                      value={addForm.role}
                      onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="candidate">Candidate</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {addLoading ? 'Inviting...' : 'Invite Candidate'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      {compareData && (
        <div className="fixed inset-0 z-[60] flex justify-center items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setCompareData(null)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-slate-800">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Candidate Comparison</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">Comparing {compareData.length} profiles side-by-side</p>
              </div>
              <button 
                onClick={() => setCompareData(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {compareData.map((c) => (
                  <div key={c.id} className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/20">
                        {c.full_name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{c.full_name}</h4>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{c.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Avg Score</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{Math.round(c.avg_score || 0)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sessions</p>
                        <p className="text-2xl font-black text-gray-700 dark:text-slate-300">{c.session_count}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {[
                        { label: 'Confidence', key: 'confidence' },
                        { label: 'Clarity', key: 'clarity' },
                        { label: 'Objection Handling', key: 'objection_handling' },
                        { label: 'Closing', key: 'closing' },
                      ].map((s: any) => {
                        const val = Math.round(c[s.key] || 0);
                        return (
                          <div key={s.key} className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-gray-500 dark:text-slate-400 uppercase tracking-tight">{s.label}</span>
                              <span className="text-gray-900 dark:text-white">{val}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${val >= 80 ? 'bg-emerald-500' : val >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                style={{ width: `${val}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setCompareData(null)}
                className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 text-sm"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

        <div onClick={() => onNavigate('topics')} className="cursor-pointer bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden hover:border-purple-300 dark:hover:border-purple-700/50 transition-colors shadow-sm group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 dark:from-purple-600/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-600/20 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <Activity className="h-4 w-4 text-gray-300 dark:text-slate-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{data.stats.total_topics ?? 0}</p>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 font-medium">Total Topics</p>
            <p className="text-xs text-purple-500 dark:text-purple-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View all →</p>
          </div>
        </div>
      </div>

      {/* Score Distribution + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data.score_distribution?.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
            <h2 className="text-gray-900 dark:text-white font-semibold text-base mb-2">Score Distribution</h2>
            <div className="flex-1 min-h-[220px] w-full">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.score_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="band" 
                    tick={{ fontSize: 10, fontWeight: 600 }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.replace('_', ' ').split(' ')[0]}
                  />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 rounded-lg shadow-xl">
                            <p className="text-xs font-bold capitalize text-gray-700 dark:text-slate-200">{payload[0].payload.band.replace('_', ' ')}</p>
                            <p className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{payload[0].value} Candidates</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                    {data.score_distribution.map((entry, index) => (
                      <Cell 
                        key={index} 
                        fill={
                          entry.band === 'excellent' ? '#10B981' : 
                          entry.band === 'good' ? '#3B82F6' : 
                          entry.band === 'average' ? '#F59E0B' : '#EF4444'
                        } 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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

// ─── Users Tab ────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  admin:      'bg-red-50 dark:bg-red-400/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-400/20',
  supervisor: 'bg-purple-50 dark:bg-purple-400/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-400/20',
  candidate:  'bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-400/20',
};

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', full_name: '', department: '', role: 'candidate' });
  const [addLoading, setAddLoading] = useState(false);
  const [addedUser, setAddedUser] = useState<{ email: string; tempPassword: string } | null>(null);

  const loadUsers = useCallback((q: string) => {
    setLoading(true);
    adminApi.listUsers(q)
      .then(res => setUsers(res.data.users))
      .catch((err) => console.error('Failed to load users:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadUsers(''); }, [loadUsers]);

  const handleSearch = (q: string) => {
    setSearch(q);
    loadUsers(q);
  };

  const handleRoleChange = async (id: string, role: string) => {
    setUpdatingId(id);
    try {
      await adminApi.updateUserRole(id, role);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
      setToast('Role updated successfully');
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast('Failed to update role');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (id: string, currentStatus: boolean) => {
    setUpdatingId(id);
    try {
      const { companyApi } = await import('@/lib/api');
      await companyApi.toggleUserStatus(id, !currentStatus);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
      setToast(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setToast(err.response?.data?.error || 'Failed to update status');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const { companyApi } = await import('@/lib/api');
      const resAuth = await companyApi.inviteUser(addForm);
      setToast('User invited successfully!');
      
      setAddedUser({
        email: addForm.email,
        tempPassword: resAuth.data.tempPassword,
      });

      setAddForm({ email: '', full_name: '', department: '', role: 'candidate' });
      loadUsers(search);
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      setToast(err.response?.data?.error || 'Failed to invite candidate');
      setTimeout(() => setToast(null), 4000);
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700">
          {toast}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold text-base">All Users</h2>
            <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5">{users.length} registered users</p>
          </div>
          <div className="flex items-center gap-3">
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
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Invite Candidate
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-8 w-8 text-gray-300 dark:text-slate-600" />
            <p className="text-gray-400 dark:text-slate-500 text-sm">No users found</p>
          </div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800">
                {['User', 'Department', 'Role', 'Temp Password', 'Status', 'Joined'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider bg-gray-50 dark:bg-slate-800/50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.full_name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-200">{u.full_name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-slate-400">
                    {u.department || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${ROLE_COLORS[u.role] ?? ''}`}>
                        <ShieldCheck className="h-2.5 w-2.5" />
                        {u.role.replace('_', ' ')}
                      </span>
                      <select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="px-2 py-1 text-[11px] text-gray-700 dark:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50 cursor-pointer w-28"
                      >
                        <option value="candidate">Candidate</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Admin</option>
                        <option value="company_admin">Company Admin</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.temp_password ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {u.temp_password}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(u.temp_password)}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Copy password"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleStatusChange(u.id, u.is_active)}
                      disabled={updatingId === u.id}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`}
                      role="switch"
                      aria-checked={u.is_active}
                    >
                      <span className="sr-only">Toggle user status</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${u.is_active ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                    <span className="ml-2 text-xs font-medium text-gray-500 dark:text-slate-400 capitalize">
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-400 dark:text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex justify-center items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setAddedUser(null); }} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 transform border border-gray-200 dark:border-slate-800">
            {addedUser ? (
              <div className="text-center">
                <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Candidate Added!</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                  An email has been dispatched. If it gets blocked by spam filters, you can securely share these temporary credentials manually:
                </p>
                
                <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-left border border-gray-200 dark:border-slate-700 mb-6">
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Login Email</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{addedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Temporary Password</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                        {addedUser.tempPassword}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(addedUser.tempPassword)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Copy password"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { setShowAddModal(false); setAddedUser(null); }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Invite New Candidate</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text" required
                      value={addForm.full_name}
                      onChange={e => setAddForm({ ...addForm, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                    <input
                      type="email" required
                      value={addForm.email}
                      onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Department (Optional)</label>
                    <input
                      type="text"
                      value={addForm.department}
                      onChange={e => setAddForm({ ...addForm, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Sales (Americas)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Role</label>
                    <select
                      value={addForm.role}
                      onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="candidate">Candidate</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {addLoading ? 'Inviting...' : 'Invite Candidate'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Topics Tab ───────────────────────────────────────────────────────────────
function TopicsTab() {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any | null>(null);
  
  const [form, setForm] = useState({ name: '', description: '', category: 'General', system_prompt: '' });
  const [saving, setSaving] = useState(false);

  const fetchTopics = useCallback(() => {
    setLoading(true);
    topicsApi.list().then(res => setTopics(res.data.topics)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  const openAddModal = () => {
    setEditingTopic(null);
    setForm({
      name: '',
      description: '',
      category: 'General',
      system_prompt: 'You are a realistic AI customer/prospect. Your persona is:\n- Name: [Insert Name]\n- Role: [Insert Role]\n- Goal: [What are they trying to do?]\n\nRules:\n1. Be conversational and human-like.\n2. Keep responses brief.\n3. Present the following objection: [Insert Objection].\nWait for the candidate to speak first.'
    });
    setModalOpen(true);
  };

  const openEditModal = (topic: any) => {
    setEditingTopic(topic);
    setForm({ name: topic.name, description: topic.description || '', category: topic.category || 'General', system_prompt: topic.system_prompt });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this topic? Candidates will no longer be able to train on it.')) return;
    try {
      await topicsApi.delete(id);
      fetchTopics();
    } catch (err) {
      alert('Failed to delete topic.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTopic) {
        await topicsApi.update(editingTopic.id, form);
      } else {
        await topicsApi.create(form);
      }
      setModalOpen(false);
      fetchTopics();
    } catch (err) {
      alert('Failed to save topic.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 dark:text-white font-bold text-lg">Training Topics</h2>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Manage custom AI scenarios for your candidates</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Topic
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center p-8"><div className="h-8 w-8 rounded-full border-4 border-t-indigo-500 animate-spin" /></div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-slate-400 text-sm">No custom topics found. Create one to get started!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {topics.map(t => (
              <div key={t.id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-300 transition-colors bg-gray-50 dark:bg-slate-800/40 flex flex-col group">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <BookOpen className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(t)} className="p-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-500 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm"><Edit2 className="h-[14px] w-[14px]" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-500 dark:text-slate-300 hover:text-red-500 hover:border-red-300 transition-colors shadow-sm"><Trash2 className="h-[14px] w-[14px]" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 text-gray-500 dark:text-slate-400">
                    {t.category || 'General'}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 leading-snug">{t.name}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 mb-5 flex-1">{t.description}</p>
                <div className="text-[11px] font-medium text-gray-400 dark:text-slate-500 mt-auto pt-4 border-t border-gray-200 dark:border-slate-700/80 flex justify-between">
                  <span>Created {new Date(t.created_at).toLocaleDateString()}</span>
                  <span>ID: {t.id.split('-')[0]}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                {editingTopic ? 'Edit Training Topic' : 'Create New Topic'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1.5">Topic Name</label>
                  <input
                    type="text" required value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none text-sm transition-shadow"
                    placeholder="e.g. Hostile Negotiation Practice"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none text-sm transition-shadow"
                  >
                    <option value="General">General</option>
                    <option value="Sales">Sales</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Product Demo">Product Demo</option>
                    <option value="Objection Handling">Objection Handling</option>
                    <option value="Soft Skills">Soft Skills</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1.5">Description (Optional)</label>
                <input
                  type="text" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none text-sm transition-shadow"
                  placeholder="Candidate sees this. Briefly describe the scenario context."
                />
              </div>
              <div className="flex-1 flex flex-col min-h-[250px]">
                <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1.5">System Prompt (AI Persona Context)</label>
                <textarea
                  required value={form.system_prompt}
                  onChange={e => setForm({ ...form, system_prompt: e.target.value })}
                  className="w-full flex-1 min-h-[250px] p-4 border border-gray-300 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none font-mono text-[13px] leading-relaxed resize-y transition-shadow"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                  This prompt programs the AI's behavior. Be specific about its objections, goals, and tone.
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-2 shrink-0 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 font-semibold text-sm text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm">
                  {saving ? 'Saving...' : 'Save Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────
function ReportsTab() {
  const [skills, setSkills] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.skillsReport(), adminApi.trendsReport()])
      .then(([sRes, tRes]) => {
        setSkills(sRes.data.skills);
        setTrends(tRes.data.trends);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading insights...</div>;

  const skillNames: Record<string, string> = {
    confidence: 'Confidence & Delivery',
    clarity: 'Clarity of Speech',
    objection_handling: 'Objection Handling',
    closing: 'Closing Technique',
    product_knowledge: 'Product Knowledge',
    rapport: 'Building Rapport',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Radar Chart Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-white font-bold text-lg">Skills Matrix</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Team proficiency profile</p>
            </div>
          </div>

          <div className="flex-1 min-h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={Object.entries(skills || {}).map(([key, val]) => ({
                subject: skillNames[key] || key,
                A: Math.round(Number(val)),
                fullMark: 100,
              }))}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Team Average"
                  dataKey="A"
                  stroke="#4F46E5"
                  fill="#4F46E5"
                  fillOpacity={0.5}
                />
                <Tooltip 
                   content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 rounded-lg shadow-xl text-xs">
                          <p className="font-bold text-gray-700 dark:text-slate-200">{payload[0].payload.subject}</p>
                          <p className="text-indigo-600 dark:text-indigo-400 font-black">{payload[0].value}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area Chart Section */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-600/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-white font-bold text-lg">Performance Trends</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Team progress over 30 days</p>
            </div>
          </div>

          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-xl shadow-2xl">
                          <p className="text-xs font-bold text-gray-400 mb-1">{new Date(payload[0].payload.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Avg Score</p>
                              <p className="text-lg font-black text-emerald-600">{payload[0].value}</p>
                            </div>
                            <div className="w-px h-8 bg-gray-100 dark:bg-slate-700" />
                            <div>
                              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sessions</p>
                              <p className="text-lg font-black text-gray-700 dark:text-slate-200">{payload[0].payload.session_count}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="avg_score" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Historical Data Table - Reduced version */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
              <th className="px-8 py-4 text-left">Timeline</th>
              <th className="px-8 py-4 text-center">Efficiency</th>
              <th className="px-8 py-4 text-center">Volume</th>
              <th className="px-8 py-4 text-right">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
            {trends.slice().reverse().map((t, i, arr) => {
              const prev = arr[i + 1]?.avg_score;
              const diff = prev ? t.avg_score - prev : 0;
              return (
                <tr key={t.date} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-8 py-4">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {new Date(t.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className={`inline-flex items-center justify-center h-8 w-14 rounded-xl font-black text-xs ${
                      t.avg_score >= 80 ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400' :
                      t.avg_score >= 60 ? 'bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400' :
                      'bg-red-50 dark:bg-red-400/10 text-red-700 dark:text-red-400'
                    }`}>
                      {t.avg_score}%
                    </span>
                  </td>
                  <td className="px-8 py-4 text-center text-sm text-gray-500 dark:text-slate-400 font-bold">{t.session_count} <span className="text-[10px] font-medium text-gray-400">calls</span></td>
                  <td className="px-8 py-4 text-right">
                    {diff !== 0 ? (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-black px-2 py-1 rounded-lg ${diff > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
    { id: 'overview',   icon: BarChart2,    label: 'Overview'   },
    { id: 'candidates', icon: Users,        label: 'Candidates' },
    { id: 'sessions',   icon: Activity,     label: 'Sessions'   },
    { id: 'topics',     icon: BookOpen,     label: 'Topics'     },
    { id: 'reports',    icon: TrendingUp,   label: 'Reports'    },
    { id: 'users',      icon: ShieldCheck,  label: 'Users'      },
  ];

  const PAGE_TITLES: Record<Tab, string> = {
    overview:   'Supervisor Dashboard',
    candidates: 'Candidates',
    sessions:   'All Sessions',
    topics:     'Training Topics',
    reports:    'Evaluation Reporting',
    users:      'User Management',
  };

  const PAGE_SUB: Record<Tab, string> = {
    overview:   'Monitor candidate performance & sessions',
    candidates: 'Manage and review all registered candidates',
    sessions:   'Browse and filter all training sessions',
    topics:     'Create and manage custom AI training scenarios',
    reports:    'Deep insights into team performance and progress',
    users:      'Manage user accounts and assign roles',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex transition-colors duration-300">

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0 transition-colors duration-300">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-200 dark:border-slate-800">
          <Logo theme="light" className="h-9 w-auto block dark:hidden" />
          <Logo theme="dark" className="h-9 w-auto hidden dark:block" />
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

      </aside>

      {/* ── Main ── */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-900/50 backdrop-blur border-b border-gray-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300">
          <div>
            <h1 className="text-gray-900 dark:text-white font-bold text-xl">{PAGE_TITLES[activeTab]}</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">{PAGE_SUB[activeTab]}</p>
          </div>

          {/* Right side: date · appearance · user · logout */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600/30 text-xs rounded-full font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>

            <ThemeToggle />

            {/* User info */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.full_name?.charAt(0).toUpperCase() ?? 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-gray-900 dark:text-slate-200 text-xs font-semibold leading-none">{user?.full_name ?? 'Admin'}</p>
                <p className="text-gray-400 dark:text-slate-500 text-[10px] capitalize mt-0.5">{user?.role}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              title="Logout"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-slate-700 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:block text-xs font-medium">Logout</span>
            </button>
          </div>
        </header>

        <main className="px-8 py-8">
          {activeTab === 'overview'   && data && <OverviewTab data={data} onNavigate={setActiveTab} />}
          {activeTab === 'candidates' && <CandidatesTab />}
          {activeTab === 'sessions'   && <SessionsTab />}
          {activeTab === 'topics'     && <TopicsTab />}
          {activeTab === 'reports'    && <ReportsTab />}
          {activeTab === 'users'      && <UsersTab />}
        </main>
      </div>
    </div>
  );
}
