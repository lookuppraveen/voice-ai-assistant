'use client';

import { CandidateWithStats } from '@/types';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

interface CandidateTableProps {
  candidates: CandidateWithStats[];
  onToggleStatus: (id: string) => void;
  onViewSessions?: (id: string) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export const CandidateTable = ({ candidates, onToggleStatus, onViewSessions, selectedIds = [], onSelectionChange }: CandidateTableProps) => {
  const router = useRouter();

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.length === candidates.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(candidates.map((c) => c.id));
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-800">
            <th className="px-6 py-3 bg-gray-50 dark:bg-slate-800/50">
              <input
                type="checkbox"
                checked={candidates.length > 0 && selectedIds.length === candidates.length}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </th>
            {['Candidate', 'Department', 'Sessions', 'Avg Score', 'Status', 'Actions'].map((h) => (
              <th
                key={h}
                className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider bg-gray-50 dark:bg-slate-800/50"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
          {candidates.map((c) => {
            const avg = c.avg_score != null ? Math.round(Number(c.avg_score)) : null;
            const scoreStyle = avg == null
              ? 'text-gray-400 dark:text-slate-500'
              : avg >= 80
              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10'
              : avg >= 60
              ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/10'
              : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-400/10';

            return (
              <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors group ${selectedIds.includes(c.id) ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''}`}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleOne(c.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </td>
                {/* Candidate */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {c.full_name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-slate-200 text-sm font-medium">{c.full_name}</p>
                      <p className="text-gray-400 dark:text-slate-500 text-xs">{c.email}</p>
                    </div>
                  </div>
                </td>

                {/* Department */}
                <td className="px-6 py-4">
                  {c.department
                    ? <span className="text-gray-700 dark:text-slate-300 text-sm">{c.department}</span>
                    : <span className="text-gray-300 dark:text-slate-600 text-sm">—</span>
                  }
                </td>

                {/* Sessions */}
                <td className="px-6 py-4">
                  <span className="text-gray-700 dark:text-slate-300 text-sm font-medium">{c.total_sessions}</span>
                </td>

                {/* Avg Score */}
                <td className="px-6 py-4">
                  {avg != null ? (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${scoreStyle}`}>
                      {avg}
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-slate-600 text-sm">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    c.is_active
                      ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20'
                      : 'bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-slate-500'}`} />
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onViewSessions ? onViewSessions(c.id) : router.push(`/admin/candidates?id=${c.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white text-xs font-medium transition-colors border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                    >
                      View <ChevronRight className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onToggleStatus(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        c.is_active
                          ? 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                      }`}
                    >
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
