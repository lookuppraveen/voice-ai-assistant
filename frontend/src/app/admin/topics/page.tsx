'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { topicsApi } from '@/lib/api';
import { getToken, getStoredUser } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  created_at: string;
}

export default function AdminTopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    system_prompt: '',
  });

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();
    if (!token || !['admin', 'company_admin', 'system_admin'].includes(user?.role || '')) {
      router.push('/dashboard');
      return;
    }
    loadTopics();
  }, [router]);

  const loadTopics = async () => {
    try {
      const res = await topicsApi.list();
      setTopics(res.data.topics || []);
    } catch (err) {
      setError('Failed to load topics.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await topicsApi.create(form);
      setForm({ name: '', description: '', system_prompt: '' });
      setIsCreating(false);
      loadTopics();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create topic');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!form.name.trim()) {
      setError('Please enter a scenario name first.');
      return;
    }
    setIsGenerating(true);
    setError('');
    try {
      const res = await topicsApi.generatePrompt({ name: form.name, description: form.description });
      setForm(prev => ({ ...prev, system_prompt: res.data.system_prompt }));
    } catch (err: any) {
      setError('Failed to generate prompt with AI. Please try writing it manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) return;
    try {
      await topicsApi.delete(id);
      loadTopics();
    } catch (err) {
      alert('Failed to delete topic');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading topics...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Topic Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Design custom AI scenarios for your team</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>Create New Topic</Button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {isCreating && (
        <Card className="mb-8">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Create New Scenario</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-1">Scenario Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="e.g., Aggressive Objection Handling"
              />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="Brief summary for candidates"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium dark:text-gray-300">AI System Prompt</label>
                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  disabled={isGenerating || !form.name.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <Sparkles className={`h-3 w-3 ${isGenerating ? 'animate-pulse' : ''}`} />
                  {isGenerating ? 'AI Thinking...' : 'Generate with AI'}
                </button>
              </div>
              <textarea
                required
                rows={6}
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white font-mono text-sm"
                placeholder="You are a tough prospect..."
              ></textarea>
              <p className="text-xs text-gray-500 mt-1">Define the persona, rules, and behavior for the AI prospect.</p>
            </div>
            <div className="flex gap-4 pt-2">
              <Button type="submit" loading={submitting}>Save Topic</Button>
              <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-6">
        {topics.length === 0 && !isCreating ? (
          <Card className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No custom topics yet</h3>
            <p className="text-gray-500">Create a topic so your candidates have something to practice with.</p>
          </Card>
        ) : (
          topics.map((topic) => (
            <Card key={topic.id} className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold dark:text-white mb-1">{topic.name}</h3>
                {topic.description && <p className="text-gray-600 dark:text-gray-300 mb-4">{topic.description}</p>}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 line-clamp-3">
                    {topic.system_prompt}
                  </p>
                </div>
              </div>
              <div>
                <Button variant="danger" onClick={() => handleDelete(topic.id)}>Delete</Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
