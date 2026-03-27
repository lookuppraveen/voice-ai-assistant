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
  register: (data: { email: string; password: string; full_name: string; role?: string; department?: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  updateProfile: (data: { full_name?: string; department?: string; phone?: string; bio?: string; avatar?: string }) =>
    api.put('/api/auth/profile', data),
};

// Sessions
export const sessionsApi = {
  scenarios: () => api.get('/api/sessions/scenarios'),
  list: (page = 1, limit = 10) =>
    api.get(`/api/sessions?page=${page}&limit=${limit}`),
  get: (id: string) => api.get(`/api/sessions/${id}`),
  start: (scenario_type: string) =>
    api.post('/api/sessions', { scenario_type }),
  sendTextTurn: (sessionId: string, text: string) =>
    api.post(`/api/sessions/${sessionId}/text-turn`, { text }),
  complete: (sessionId: string) =>
    api.post(`/api/sessions/${sessionId}/complete`),
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
};

export default api;
