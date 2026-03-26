'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { clearAuth, getStoredUser } from '@/lib/auth';
import { AdminStats, CandidateWithStats } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CandidateTable } from '@/components/admin/CandidateTable';
import { Users, BarChart2, Star, LogOut, Mic } from 'lucide-react';

interface DashboardData {
  stats: AdminStats;
  recent_sessions: any[];
  score_distribution: { band: string; count: number }[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [candidates, setCandidates] = useState<CandidateWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role === 'candidate') { router.push('/dashboard'); return; }

    Promise.all([adminApi.stats(), adminApi.candidates(1, 20, '')])
      .then(([statsRes, candRes]) => {
        setData(statsRes.data);
        setCandidates(candRes.data.candidates);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSearch = async (q: string) => {
    setSearch(q);
    const res = await adminApi.candidates(1, 20, q);
    setCandidates(res.data.candidates);
  };

  const handleToggleStatus = async (id: string) => {
    await adminApi.toggleStatus(id);
    const res = await adminApi.candidates(1, 20, search);
    setCandidates(res.data.candidates);
  };

  const logout = () => { clearAuth(); router.push('/login'); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-gray-900">VoiceCoach AI</span>
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium capitalize">
            {user?.role}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 mr-1" /> Logout
        </Button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Supervisor Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: <Users className="h-5 w-5 text-blue-600" />, label: 'Total Candidates', value: data?.stats.total_candidates ?? 0 },
            { icon: <BarChart2 className="h-5 w-5 text-green-600" />, label: 'Sessions Completed', value: data?.stats.total_sessions ?? 0 },
            { icon: <Star className="h-5 w-5 text-yellow-500" />, label: 'Average Score', value: data?.stats.average_score ? Math.round(data.stats.average_score) : '—' },
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

        {/* Score Distribution */}
        {data?.score_distribution && data.score_distribution.length > 0 && (
          <Card className="mb-8">
            <CardHeader><CardTitle>Score Distribution</CardTitle></CardHeader>
            <div className="flex gap-6 flex-wrap">
              {data.score_distribution.map((d) => (
                <div key={d.band} className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{d.count}</p>
                  <p className="text-sm text-gray-500 capitalize">{d.band.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent Activity */}
        {data?.recent_sessions && data.recent_sessions.length > 0 && (
          <Card className="mb-8">
            <CardHeader><CardTitle>Recent Sessions</CardTitle></CardHeader>
            <div className="space-y-2">
              {data.recent_sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{s.scenario_type?.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold ${s.score >= 80 ? 'text-green-600' : s.score >= 60 ? 'text-blue-600' : 'text-red-500'}`}>
                      {s.score}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/session/${s.id}`)}>
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Candidates */}
        <Card padding="none">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <CardTitle>Candidates</CardTitle>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          {candidates.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No candidates found</p>
          ) : (
            <CandidateTable candidates={candidates} onToggleStatus={handleToggleStatus} />
          )}
        </Card>
      </main>
    </div>
  );
}
