'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { superAdminApi, adminApi } from '@/lib/api';

import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { LogOut, Eye, X, Activity, Calendar, Clock } from 'lucide-react';

const SCENARIO_LABELS: Record<string, string> = {
  cold_call:            'Cold Call',
  product_demo:         'Product Demo',
  objection_handling:   'Objection Handling',
  groww_discovery_call: 'Groww HNI Discovery',
};

function scoreStyle(score: number | null) {
  if (score == null) return 'text-gray-400';
  if (score >= 80) return 'text-emerald-700 bg-emerald-50';
  if (score >= 60) return 'text-blue-700 bg-blue-50';
  return 'text-red-700 bg-red-50';
}

function CandidateDrawer({ candidateId, onClose }: { candidateId: string; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.candidateSessions(candidateId)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [candidateId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between shrink-0">
          {loading ? (
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
          ) : (
            <div>
              <p className="font-bold text-gray-900 text-lg">{data?.candidate?.full_name}</p>
              <p className="text-gray-500 text-sm">{data?.candidate?.email}</p>
            </div>
          )}
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Stats row */}
        {!loading && data && (
          <div className="grid grid-cols-3 gap-px bg-gray-200 border-b border-gray-200 shrink-0">
            {[
              { label: 'Sessions', value: data.sessions.length },
              { label: 'Avg Score', value: data.sessions.filter((s:any) => s.score != null).length
                  ? Math.round(data.sessions.filter((s:any) => s.score != null).reduce((a:number,s:any) => a + s.score, 0) / data.sessions.filter((s:any) => s.score != null).length)
                  : '—' },
              { label: 'Department', value: data.candidate.department || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white px-4 py-3 text-center">
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))
          ) : data?.sessions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Activity className="h-8 w-8 text-gray-300" />
              <p className="text-gray-400 text-sm">No sessions yet</p>
            </div>
          ) : (
            data?.sessions?.map((s: any) => {
              const sc = s.score != null ? Math.round(s.score) : null;
              return (
                <div key={s.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {SCENARIO_LABELS[s.scenario_type] || s.scenario_type}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {new Date(s.started_at).toLocaleDateString()}
                      </span>
                      {s.duration_seconds && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
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
                        className="p-1.5 rounded-lg bg-white border border-gray-200 hover:border-indigo-400 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-gray-500" />
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

export default function CompanyAuditPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchCompanyData();
    }
  }, [companyId]);

  const fetchCompanyData = async () => {
    try {
      const res = await superAdminApi.getCompanyAudits(companyId);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load company audit data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleLogout = () => {
    import('@/lib/auth').then(({ clearAuth }) => {
      clearAuth();
      router.push('/login');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Logo theme="light" className="h-8 w-auto" />
        <Button variant="secondary" size="sm" onClick={handleLogout} className="flex items-center gap-2">
           <LogOut className="h-4 w-4" />
           Sign Out
        </Button>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex space-x-4 items-center">
          <Button variant="secondary" onClick={() => router.push('/super-admin')}>
            &larr; Back to Dashboard
          </Button>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Auditing: {data?.company?.name || 'Loading...'}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Registered on {data?.company ? new Date(data.company.created_at).toLocaleDateString() : ''}
            </p>
          </div>
          <div className="text-right">
             <div className="text-sm text-gray-500">Total Lifecycle Sessions</div>
             <div className="text-2xl font-bold text-indigo-700">{data?.total_sessions || 0}</div>
          </div>
        </div>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-white flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Roster</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                      <div className="text-xs text-gray-500 font-medium">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        user.role === 'company_admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => setSelectedCandidate(user.id)}
                        className="text-indigo-600 hover:text-indigo-900 border p-1 rounded hover:bg-indigo-50 transition"
                        title="View Sessions"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {data?.users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                      This company has no active roster.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {selectedCandidate && (
        <CandidateDrawer 
          candidateId={selectedCandidate} 
          onClose={() => setSelectedCandidate(null)} 
        />
      )}
    </div>
  );
}
