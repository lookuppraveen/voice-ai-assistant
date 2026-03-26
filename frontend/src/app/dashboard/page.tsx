'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sessionsApi, authApi } from '@/lib/api';
import { clearAuth, getStoredUser } from '@/lib/auth';
import { SessionWithBreakdown, User, Scenario } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Mic, TrendingUp, Clock, Award, LogOut, Play } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionWithBreakdown[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.push('/login'); return; }
    if (stored.role !== 'candidate') { router.push('/admin'); return; }
    setUser(stored);

    Promise.all([sessionsApi.list(), sessionsApi.scenarios()])
      .then(([sessRes, scenRes]) => {
        setSessions(sessRes.data.sessions);
        setScenarios(scenRes.data.scenarios);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const logout = () => { clearAuth(); router.push('/login'); };

  const avgScore = sessions.length
    ? Math.round(sessions.filter(s => s.score != null).reduce((a, s) => a + (s.score || 0), 0) /
        sessions.filter(s => s.score != null).length)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-gray-900">VoiceCoach AI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hello, {user?.full_name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: <Award className="h-5 w-5 text-blue-600" />, label: 'Avg Score', value: avgScore ?? '—' },
            { icon: <TrendingUp className="h-5 w-5 text-green-600" />, label: 'Sessions', value: sessions.length },
            {
              icon: <Clock className="h-5 w-5 text-purple-600" />,
              label: 'Total Time',
              value: sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) > 0
                ? `${Math.round(sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / 60)}m`
                : '—',
            },
          ].map(({ icon, label, value }) => (
            <Card key={label} className="flex items-center gap-4">
              <div className="p-3 bg-gray-50 rounded-xl">{icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Start Training */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Start a Training Session</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Choose a scenario to practice</p>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/session?scenario=${s.id}`)}
                className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
              >
                <Play className="h-6 w-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-500 mt-1">Click to start</p>
              </button>
            ))}
          </div>
        </Card>

        {/* Session History */}
        <Card>
          <CardHeader><CardTitle>Session History</CardTitle></CardHeader>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No sessions yet. Start your first training!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    {['Scenario', 'Date', 'Duration', 'Score', 'Status', ''].map((h) => (
                      <th key={h} className="pb-2 px-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="py-3 px-2 text-sm text-gray-700 capitalize">{s.scenario_type.replace('_', ' ')}</td>
                      <td className="py-3 px-2 text-sm text-gray-500">
                        {new Date(s.started_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-500">
                        {s.duration_seconds ? `${Math.round(s.duration_seconds / 60)}m` : '—'}
                      </td>
                      <td className="py-3 px-2">
                        {s.score != null ? (
                          <span className={`font-bold ${s.score >= 80 ? 'text-green-600' : s.score >= 60 ? 'text-blue-600' : 'text-red-500'}`}>
                            {s.score}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={s.status === 'completed' ? 'success' : 'warning'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        {s.status === 'completed' && (
                          <Button size="sm" variant="ghost" onClick={() => router.push(`/session/${s.id}`)}>
                            Review
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
