import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const qualificationsApi = {
  getAll: (params) => api.get('/qualifications', { params }),
  getById: (id) => api.get(`/qualifications/${id}`),
  fetch: (id) => api.post(`/qualifications/${id}/fetch`),
  getCategories: () => api.get('/qualifications/meta/categories'),
};

export const calendarApi = {
  getEvents: () => api.get('/calendar/events'),
};

export const adminApi = {
  createQualification: (data) => api.post('/admin/qualifications', data),
  updateQualification: (id, data) => api.put(`/admin/qualifications/${id}`, data),
  deleteQualification: (id) => api.delete(`/admin/qualifications/${id}`),
  updateSchedule: (qualificationId, data) => api.put(`/admin/schedules/${qualificationId}`, data),
  getLogs: () => api.get('/admin/logs'),
  fetchAll: () => api.post('/admin/fetch-all'),
};

export default api;
