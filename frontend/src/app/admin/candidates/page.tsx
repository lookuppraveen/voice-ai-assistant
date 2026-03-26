'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { SessionDetail } from '@/components/admin/SessionDetail';
import Button from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

function CandidateDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const candidateId = searchParams.get('id');

  const [data, setData] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!candidateId) { router.push('/admin'); return; }
    adminApi
      .candidateSessions(candidateId)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [candidateId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  if (selectedSession) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sessions
          </Button>
          <SessionDetail session={selectedSession} messages={selectedSession._messages || []} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{data.candidate.full_name}</h1>
          <p className="text-gray-500">{data.candidate.email} · {data.candidate.department || 'No dept'}</p>
        </div>

        <div className="space-y-3">
          {data.sessions.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No sessions yet</p>
          ) : (
            data.sessions.map((s: any) => (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-blue-200 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900 capitalize">{s.scenario_type.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(s.started_at).toLocaleDateString()} ·{' '}
                    {s.duration_seconds ? `${Math.round(s.duration_seconds / 60)}m` : 'n/a'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {s.score != null && (
                    <span className={`text-xl font-bold ${s.score >= 80 ? 'text-green-600' : s.score >= 60 ? 'text-blue-600' : 'text-red-500'}`}>
                      {s.score}
                    </span>
                  )}
                  {s.status === 'completed' && (
                    <Button size="sm" onClick={() => {
                      // We'll show inline — for messages, fetch from session detail
                      setSelectedSession(s);
                    }}>
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>}>
      <CandidateDetailContent />
    </Suspense>
  );
}
