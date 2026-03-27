'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sessionsApi } from '@/lib/api';
import { clearAuth, getStoredUser } from '@/lib/auth';
import { SessionWithBreakdown, User, Scenario } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Logo } from '@/components/ui/Logo';
import {
  TrendingUp, Clock, Award, LogOut, Play,
  PhoneCall, Presentation, ShieldAlert, Building2,
  ChevronLeft, ChevronRight, UserCircle,
} from 'lucide-react';

const SESSIONS_PER_PAGE = 5;

const SCENARIO_ICONS: Record<string, React.ReactNode> = {
  cold_call:            <PhoneCall className="h-6 w-6 text-blue-600" />,
  product_demo:         <Presentation className="h-6 w-6 text-purple-600" />,
  objection_handling:   <ShieldAlert className="h-6 w-6 text-orange-500" />,
  groww_discovery_call: <Building2 className="h-6 w-6 text-emerald-600" />,
};

const TAG_STYLES: Record<string, string> = {
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  purple:  'bg-purple-50 text-purple-700 border-purple-200',
  orange:  'bg-orange-50 text-orange-700 border-orange-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const BORDER_HOVER: Record<string, string> = {
  blue:    'hover:border-blue-400 hover:bg-blue-50/50 dark:hover:border-blue-600 dark:hover:bg-blue-900/10',
  purple:  'hover:border-purple-400 hover:bg-purple-50/50 dark:hover:border-purple-600 dark:hover:bg-purple-900/10',
  orange:  'hover:border-orange-400 hover:bg-orange-50/50 dark:hover:border-orange-600 dark:hover:bg-orange-900/10',
  emerald: 'hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/10',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionWithBreakdown[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionPage, setSessionPage] = useState(1);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.push('/login'); return; }
    if (stored.role !== 'candidate') { router.push('/admin'); return; }
    setUser(stored);

    Promise.all([sessionsApi.list(1, 100), sessionsApi.scenarios()])
      .then(([sessRes, scenRes]) => {
        setSessions(sessRes.data.sessions);
        setScenarios(scenRes.data.scenarios);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const logout = () => { clearAuth(); router.push('/login'); };

  const scoredSessions = sessions.filter(s => s.score != null);
  const avgScore = scoredSessions.length
    ? Math.round(scoredSessions.reduce((a, s) => a + (s.score || 0), 0) / scoredSessions.length)
    : null;
  const totalMins = Math.round(sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / 60);

  // Pagination
  const totalPages = Math.ceil(sessions.length / SESSIONS_PER_PAGE);
  const pagedSessions = sessions.slice((sessionPage - 1) * SESSIONS_PER_PAGE, sessionPage * SESSIONS_PER_PAGE);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-4 border-gray-200 dark:border-slate-700" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">

      {/* ── Nav ── */}
      <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300">
        <Logo theme="light" className="h-10 w-auto block dark:hidden" />
        <Logo theme="dark" className="h-10 w-auto hidden dark:block" />

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Profile avatar button */}
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors group"
            title="My Profile"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-600 dark:text-slate-300 font-medium hidden sm:block">
              {user?.full_name?.split(' ')[0]}
            </span>
            <UserCircle className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" />
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
              label: 'Avg Score', value: avgScore ?? '—',
              bg: 'bg-blue-50 dark:bg-blue-900/20',
            },
            {
              icon: <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
              label: 'Sessions', value: sessions.length,
              bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            },
            {
              icon: <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
              label: 'Total Time', value: totalMins > 0 ? `${totalMins}m` : '—',
              bg: 'bg-purple-50 dark:bg-purple-900/20',
            },
          ].map(({ icon, label, value, bg }) => (
            <div key={label} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Start Training ── */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-8">
          <h2 className="text-gray-900 dark:text-white font-bold text-lg mb-1">Start a Training Session</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">Choose a scenario to practice</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {scenarios.map((s) => {
              const color = s.tagColor ?? 'blue';
              const isHNI = s.id === 'groww_discovery_call';
              return (
                <button
                  key={s.id}
                  onClick={() => router.push(`/session?scenario=${s.id}`)}
                  className={`relative p-5 border-2 border-gray-200 dark:border-slate-700 rounded-2xl transition-all text-left group flex flex-col gap-3 ${BORDER_HOVER[color]} ${isHNI ? 'ring-1 ring-emerald-200 dark:ring-emerald-800' : ''}`}
                >
                  {isHNI && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 bg-emerald-600 text-white rounded-full uppercase tracking-wide">New</span>
                  )}
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                    color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/30' :
                    color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/30' :
                    color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/30' :
                    'bg-emerald-50 dark:bg-emerald-900/30'
                  }`}>
                    {SCENARIO_ICONS[s.id] ?? <Play className="h-6 w-6 text-gray-500" />}
                  </div>
                  {s.tag && (
                    <span className={`self-start text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TAG_STYLES[color]}`}>
                      {s.tag}
                    </span>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">{s.description}</p>}
                  </div>
                  <div className={`mt-auto flex items-center gap-1 text-xs font-semibold ${
                    color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                    color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                    'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <Play className="h-3 w-3" /> Start Session
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Session History ── */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-gray-900 dark:text-white font-bold text-lg">Session History</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sessions.length} sessions total</p>
            </div>
            {totalPages > 1 && (
              <span className="text-xs text-gray-400 dark:text-slate-500">
                Page {sessionPage} of {totalPages}
              </span>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                <Play className="h-5 w-5 text-gray-400 dark:text-slate-600" />
              </div>
              <p className="text-gray-400 dark:text-slate-500 text-sm">No sessions yet. Start your first training!</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800">
                      {['Scenario', 'Date', 'Duration', 'Score', 'Status', ''].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider bg-gray-50 dark:bg-slate-800/50">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                    {pagedSessions.map(s => {
                      const sc = s.score;
                      const scoreClass = sc == null ? '' : sc >= 80
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10'
                        : sc >= 60
                        ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/10'
                        : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-400/10';

                      const LABELS: Record<string, string> = {
                        cold_call: 'Cold Call', product_demo: 'Product Demo',
                        objection_handling: 'Objection Handling', groww_discovery_call: 'Groww HNI Discovery',
                      };

                      return (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors group">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                {SCENARIO_ICONS[s.scenario_type] ?? <Play className="h-3.5 w-3.5" />}
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-slate-200">
                                {LABELS[s.scenario_type] || s.scenario_type}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-slate-400">
                            {new Date(s.started_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-slate-400">
                            {s.duration_seconds ? `${Math.round(s.duration_seconds / 60)}m` : '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            {sc != null
                              ? <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-lg ${scoreClass}`}>{sc}</span>
                              : <span className="text-gray-300 dark:text-slate-600">—</span>
                            }
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              s.status === 'completed'
                                ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20'
                                : 'bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-400/20'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${s.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {s.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {s.status === 'completed' && (
                              <button
                                onClick={() => router.push(`/session/${s.id}`)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-all bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700"
                              >
                                Review <ChevronRight className="h-3 w-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-slate-400">
                    Showing {(sessionPage - 1) * SESSIONS_PER_PAGE + 1}–{Math.min(sessionPage * SESSIONS_PER_PAGE, sessions.length)} of {sessions.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={sessionPage === 1}
                      onClick={() => setSessionPage(p => p - 1)}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSessionPage(i + 1)}
                        className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                          sessionPage === i + 1
                            ? 'bg-indigo-600 text-white'
                            : 'border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      disabled={sessionPage === totalPages}
                      onClick={() => setSessionPage(p => p + 1)}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
