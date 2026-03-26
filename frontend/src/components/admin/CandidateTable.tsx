'use client';

import { CandidateWithStats } from '@/types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface CandidateTableProps {
  candidates: CandidateWithStats[];
  onToggleStatus: (id: string) => void;
}

export const CandidateTable = ({ candidates, onToggleStatus }: CandidateTableProps) => {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Name', 'Email', 'Dept', 'Sessions', 'Avg Score', 'Status', 'Actions'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {candidates.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.full_name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{c.email}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{c.department || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{c.total_sessions}</td>
              <td className="px-4 py-3">
                {c.avg_score != null ? (
                  <span
                    className={
                      Number(c.avg_score) >= 80
                        ? 'text-green-600 font-semibold'
                        : Number(c.avg_score) >= 60
                        ? 'text-blue-600 font-semibold'
                        : 'text-red-600 font-semibold'
                    }
                  >
                    {Math.round(Number(c.avg_score))}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge variant={c.is_active ? 'success' : 'danger'}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-3 flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(`/admin/candidates?id=${c.id}`)}
                >
                  View
                </Button>
                <Button
                  size="sm"
                  variant={c.is_active ? 'danger' : 'secondary'}
                  onClick={() => onToggleStatus(c.id)}
                >
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
