import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const code = err.response?.data?.code;
    // Only redirect to login on genuine token errors, not DB/server errors
    if (
      err.response?.status === 401 &&
      (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' || err.response?.data?.error === 'No token provided')
    ) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; password: string; full_name: string; role?: string; department?: string; company_id?: string }) =>
    api.post('/api/auth/register', data),
  registerCompany: (data: { company_name: string; admin_email: string; admin_password: string; admin_name: string }) =>
    api.post('/api/auth/register-company', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  updateProfile: (data: { full_name?: string; department?: string; phone?: string; bio?: string; avatar?: string }) =>
    api.put('/api/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/api/auth/change-password', data),
};

// Sessions
export const sessionsApi = {
  list: (page = 1, limit = 10) =>
    api.get(`/api/sessions?page=${page}&limit=${limit}`),
  get: (id: string) => api.get(`/api/sessions/${id}`),
  start: (topic_id: string) =>
    api.post('/api/sessions', { topic_id }),
  sendTextTurn: (sessionId: string, text: string) =>
    api.post(`/api/sessions/${sessionId}/text-turn`, { text }),
  sendAudioTurn: (sessionId: string, audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'turn.webm');
    return api.post(`/api/sessions/${sessionId}/turn`, formData);
  },
  getTTSAudio: (text: string) =>
    api.post('/api/sessions/tts', { text }, { responseType: 'blob' }),
  complete: (sessionId: string) =>
    api.post(`/api/sessions/${sessionId}/complete`),
};

// Topics
export const topicsApi = {
  list: () => api.get('/api/topics'),
  get: (id: string) => api.get(`/api/topics/${id}`),
  create: (data: any) => api.post('/api/topics', data),
  generatePrompt: (data: { name: string, description?: string }) => api.post('/api/topics/generate-prompt', data),
  update: (id: string, data: any) => api.put(`/api/topics/${id}`, data),
  delete: (id: string) => api.delete(`/api/topics/${id}`),
};

// Admin
export const adminApi = {
  stats: () => api.get('/api/admin/stats'),
  sessions: (page = 1, limit = 20, scenario = '', status = '') =>
    api.get(`/api/admin/sessions?page=${page}&limit=${limit}&scenario=${scenario}&status=${status}`),
  candidates: (page = 1, limit = 20, search = '') =>
    api.get(`/api/admin/candidates?page=${page}&limit=${limit}&search=${search}`),
  candidateSessions: (id: string) =>
    api.get(`/api/admin/candidates/${id}/sessions`),
  toggleStatus: (id: string) =>
    api.patch(`/api/admin/candidates/${id}/status`),
  listUsers: (search = '') =>
    api.get(`/api/admin/users?search=${encodeURIComponent(search)}`),
  updateUserRole: (id: string, role: string) =>
    api.patch(`/api/admin/users/${id}/role`, { role }),
  skillsReport: () => api.get('/api/admin/reports/skills'),
  trendsReport: () => api.get('/api/admin/reports/trends'),
  comparisonReport: (ids: string[]) => api.get(`/api/admin/reports/compare?ids=${ids.join(',')}`),
  candidateRecommendations: (id: string) => api.get(`/api/admin/candidates/${id}/recommendations`),
};

// Company
export const companyApi = {
  listUsers: () => api.get('/api/company/users'),
  inviteUser: (data: any) => api.post('/api/company/users', data),
  toggleUserStatus: (id: string, is_active: boolean) => api.put(`/api/company/users/${id}/status`, { is_active })
};

// Super Admin
export const superAdminApi = {
  getGlobalDashboard: () => api.get('/api/super-admin/companies'),
  updateCompany: (id: string, name: string) => api.patch(`/api/super-admin/companies/${id}`, { name }),
  toggleCompanyStatus: (id: string) => api.patch(`/api/super-admin/companies/${id}/status`),
  getCompanyAudits: (id: string) => api.get(`/api/super-admin/companies/${id}/users`),
  createCompanyTopic: (id: string, data: any) => api.post(`/api/super-admin/companies/${id}/topics`, data),
  getSettings: () => api.get('/api/super-admin/settings'),
  updateSetting: (key: string, value: string) => api.patch('/api/super-admin/settings', { key, value })
};

export default api;
