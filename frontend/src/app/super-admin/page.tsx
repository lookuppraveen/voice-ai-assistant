'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { superAdminApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import {
  LogOut, Settings, Save, Plus, X, Building2,
  Users, Activity, Eye, EyeOff, CheckCircle,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  created_at: string;
  candidate_count: string;
  session_count: string;
  is_active: boolean;
}

// ── Edit Company Modal ────────────────────────────────────────────────────────
function EditCompanyModal({ company, onClose, onSave }: {
  company: Company;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(company.name);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
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

// ── Create Company Modal ──────────────────────────────────────────────────────
function CreateCompanyModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (company: Company) => void;
}) {
  const [form, setForm] = useState({
    company_name: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await superAdminApi.createCompany(form);
      setSuccess(res.data.message);
      setTimeout(() => {
        onCreated(res.data.company);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create company');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create New Company</h3>
                <p className="text-xs text-violet-200">Set up company + admin account in one step</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {success}
            </div>
          )}

          {/* Company Section */}
          <div className="pb-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Company Details</p>
            <div>
              <label className={labelCls}>Company Name *</label>
              <input
                id="new-company-name"
                type="text"
                required
                value={form.company_name}
                onChange={handleChange('company_name')}
                placeholder="e.g. Acme Corp"
                className={inputCls}
              />
            </div>
          </div>

          {/* Admin Section */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Admin Account</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Admin Full Name *</label>
                <input
                  id="new-admin-name"
                  type="text"
                  required
                  value={form.admin_name}
                  onChange={handleChange('admin_name')}
                  placeholder="e.g. John Smith"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Admin Email *</label>
                <input
                  id="new-admin-email"
                  type="email"
                  required
                  value={form.admin_email}
                  onChange={handleChange('admin_email')}
                  placeholder="admin@company.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Admin Password *</label>
                <div className="relative">
                  <input
                    id="new-admin-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.admin_password}
                    onChange={handleChange('admin_password')}
                    placeholder="Minimum 8 characters"
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">The admin will use this to log in at /login</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <button
              id="create-company-submit"
              type="submit"
              disabled={saving || !!success}
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm text-white
                bg-gradient-to-r from-violet-600 to-indigo-600
                hover:from-violet-500 hover:to-indigo-500
                disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
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
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const [dashRes, settingsRes] = await Promise.all([
        superAdminApi.getGlobalDashboard(),
        superAdminApi.getSettings(),
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
      setData((prev) =>
        prev
          ? { ...prev, companies: prev.companies.map((c) => c.id === companyId ? { ...c, is_active: res.data.company.is_active } : c) }
          : null
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle company status');
    }
  };

  const handleUpdateCompany = async (name: string) => {
    if (!editingCompany) return;
    setError('');
    try {
      const res = await superAdminApi.updateCompany(editingCompany.id, name);
      setData((prev) =>
        prev
          ? { ...prev, companies: prev.companies.map((c) => c.id === editingCompany.id ? { ...c, name: res.data.company.name } : c) }
          : null
      );
      setEditingCompany(null);
      setSuccessMsg('Company renamed successfully');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update company name');
    }
  };

  const handleCompanyCreated = (company: Company) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            total_companies: prev.total_companies + 1,
            companies: [company, ...prev.companies],
          }
        : null
    );
    setSuccessMsg(`Company "${company.name}" created successfully!`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleLogout = () => {
    import('@/lib/auth').then(({ clearAuth }) => {
      clearAuth();
      router.push('/super-admin/login');
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Logo theme="light" className="h-8 w-auto" />
          <span className="hidden sm:block text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Super Admin
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Global overview across all companies and candidates.</p>
          </div>
          <button
            id="open-create-company-btn"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white
              bg-gradient-to-r from-violet-600 to-indigo-600
              hover:from-violet-500 hover:to-indigo-500
              transition-all shadow-md shadow-violet-900/20"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
        )}
        {successMsg && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {successMsg}
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
                <option value="openai">OpenAI (ChatGPT Voice - Nova)</option>
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
          <Card className="px-5 py-6 flex flex-col items-center justify-center shadow-lg border-violet-100">
            <Building2 className="w-6 h-6 text-violet-400 mb-2" />
            <dt className="text-sm font-medium text-gray-500 truncate">Total Companies</dt>
            <dd className="mt-1 text-3xl font-bold text-violet-700">{data?.total_companies || 0}</dd>
          </Card>
          <Card className="px-5 py-6 flex flex-col items-center justify-center shadow-lg border-purple-100">
            <Users className="w-6 h-6 text-purple-400 mb-2" />
            <dt className="text-sm font-medium text-gray-500 truncate">Total Candidates</dt>
            <dd className="mt-1 text-3xl font-bold text-purple-700">{data?.total_candidates || 0}</dd>
          </Card>
          <Card className="px-5 py-6 flex flex-col items-center justify-center shadow-lg border-blue-100">
            <Activity className="w-6 h-6 text-blue-400 mb-2" />
            <dt className="text-sm font-medium text-gray-500 truncate">Total Sessions Run</dt>
            <dd className="mt-1 text-3xl font-bold text-blue-700">{data?.total_sessions || 0}</dd>
          </Card>
        </div>

        {/* Companies Table */}
        <Card className="overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-white flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Registered Companies</h3>
            <span className="text-sm text-gray-400">{data?.companies.length || 0} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Company Name', 'Candidates', 'Total Sessions', 'Portal Access', 'Joined', 'Actions'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-violet-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                          <div className="text-xs text-gray-400 font-mono">{company.id.slice(0, 8)}…</div>
                        </div>
                      </div>
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
                    <td colSpan={6} className="px-6 py-14 text-center">
                      <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No companies yet.</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-3 text-sm text-violet-600 hover:text-violet-800 font-medium"
                      >
                        + Add the first company
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* Modals */}
      {editingCompany && (
        <EditCompanyModal
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onSave={handleUpdateCompany}
        />
      )}
      {showCreateModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCompanyCreated}
        />
      )}
    </div>
  );
}
