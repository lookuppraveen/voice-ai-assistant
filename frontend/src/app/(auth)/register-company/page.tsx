'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    company_name: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.registerCompany(form);
      setAuth(res.data.token, res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-xl">
            <Logo theme="light" className="h-12 w-auto" />
          </div>
        </div>

        <Card>
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Register Your Company</h2>
            <p className="text-sm text-gray-500 mt-2">Start training your sales team with custom AI scenarios</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 bg-white"
                placeholder="Acme Corp."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Full Name</label>
              <input
                type="text"
                required
                value={form.admin_name}
                onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 bg-white"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Work Email</label>
              <input
                type="email"
                required
                value={form.admin_email}
                onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 bg-white"
                placeholder="you@acmecorp.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.admin_password}
                onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 bg-white"
                placeholder="Min. 8 characters"
              />
            </div>
            
            <Button type="submit" className="w-full" size="lg" loading={loading} variant="primary">
              Register Company
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Joining an existing company?{' '}
            <Link href="/register" className="text-indigo-600 hover:underline font-medium">
              Regular Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
