'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { superAdminApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { LogOut, Settings, Save } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  created_at: string;
  candidate_count: string;
  session_count: string;
  is_active: boolean;
}

function EditCompanyModal({ company, onClose, onSave }: { company: Company, onClose: () => void, onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(company.name);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Company</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter company name"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button 
              onClick={() => { setSaving(true); onSave(name).finally(() => setSaving(false)); }} 
              disabled={saving || !name.trim()} 
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<{
    total_companies: number;
    total_candidates: number;
    total_sessions: number;
    companies: Company[];
  } | null>(null);
  const [ttsProvider, setTtsProvider] = useState<string>('elevenlabs');
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const [dashRes, settingsRes] = await Promise.all([
        superAdminApi.getGlobalDashboard(),
        superAdminApi.getSettings()
      ]);
      setData(dashRes.data);
      if (settingsRes.data?.settings?.tts_provider) {
        setTtsProvider(settingsRes.data.settings.tts_provider);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setSuccessMsg('');
    setError('');
    try {
      await superAdminApi.updateSetting('tts_provider', ttsProvider);
      setSuccessMsg('System Voice Engine updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update system settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleStatus = async (companyId: string) => {
    setError('');
    try {
      const res = await superAdminApi.toggleCompanyStatus(companyId);
      setData(prev => prev ? {
        ...prev,
        companies: prev.companies.map(c => c.id === companyId ? { ...c, is_active: res.data.company.is_active } : c)
      } : null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle company status');
    }
  };

  const handleUpdateCompany = async (name: string) => {
    if (!editingCompany) return;
    setError('');
    try {
      const res = await superAdminApi.updateCompany(editingCompany.id, name);
      setData(prev => prev ? {
        ...prev,
        companies: prev.companies.map(c => c.id === editingCompany.id ? { ...c, name: res.data.company.name } : c)
      } : null);
      setEditingCompany(null);
      setSuccessMsg('Company renamed successfully');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update company name');
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Global overview across all companies and candidates.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
            {successMsg}
          </div>
        )}

        {/* Global Config */}
        <Card className="mb-8 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-gray-200 bg-white">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-400" /> System Voice Engine
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Select which AI provider is globally responsible for rendering the interview voice.
            </p>
          </div>
          <div className="px-6 py-5 bg-gray-50 flex items-center justify-between gap-4">
            <div className="flex-1 w-full max-w-sm">
              <select
                value={ttsProvider}
                onChange={(e) => setTtsProvider(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="elevenlabs">ElevenLabs (Turbo v2.5)</option>
                <option value="openai">OpenAI (ChatGPT Voice - Alloy)</option>
              </select>
            </div>
            <Button onClick={handleSaveConfig} disabled={savingConfig} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {savingConfig ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </Card>

        {/* Global Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <Card className="px-5 py-6 flex flex-col items-center justify-center shadow-lg border-indigo-100">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Active Companies</dt>
            <dd className="mt-2 text-3xl font-bold text-indigo-700">{data?.total_companies || 0}</dd>
          </Card>
          <Card className="px-5 py-6 flex flex-col items-center justify-center shadow-lg border-purple-100">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Candidates</dt>
            <dd className="mt-2 text-3xl font-bold text-purple-700">{data?.total_candidates || 0}</dd>
          </Card>
          <Card className="px-5 py-6 flex flex-col items-center justify-center shadow-lg border-blue-100">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Sessions Run</dt>
            <dd className="mt-2 text-3xl font-bold text-blue-700">{data?.total_sessions || 0}</dd>
          </Card>
        </div>

        {/* Companies Table */}
        <Card className="overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-white flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Registered Companies</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidates
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Sessions
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Portal Access
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{company.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-1">{company.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {company.candidate_count || '0'} users
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {company.session_count || '0'} sessions
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <button
                         onClick={() => handleToggleStatus(company.id)}
                         className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition-all ${
                           company.is_active 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700' 
                            : 'bg-red-100 text-red-700 hover:bg-emerald-100 hover:text-emerald-700'
                         }`}
                         title={company.is_active ? 'Click to disable' : 'Click to enable'}
                       >
                         {company.is_active ? 'ENABLED' : 'DISABLED'}
                       </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(company.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-indigo-600 hover:bg-indigo-50"
                        onClick={() => setEditingCompany(company)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => router.push(`/super-admin/company/${company.id}`)}
                      >
                        Audit Profiles
                      </Button>
                    </td>
                  </tr>
                ))}
                {data?.companies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                      No companies have registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {editingCompany && (
        <EditCompanyModal 
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onSave={handleUpdateCompany}
        />
      )}
    </div>
  );
}
