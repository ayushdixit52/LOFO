import axios from 'axios';

const configuredUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const apiRoot = configuredUrl.replace(/\/+$/, '').endsWith('/api')
  ? configuredUrl.replace(/\/+$/, '')
  : `${configuredUrl.replace(/\/+$/, '')}/api`;

const http = axios.create({
  baseURL: apiRoot,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

const dataOf = (response) => response.data?.data;

export const reportApi = {
  list: async (params = {}) => {
    const response = await http.get('/reports', { params });
    return {
      reports: Array.isArray(dataOf(response)) ? dataOf(response) : [],
      pagination: response.data?.pagination ?? null,
    };
  },
  get: async (id) => dataOf(await http.get(`/reports/${encodeURIComponent(id)}`)),
  matches: async (id) => {
    const result = dataOf(await http.get(`/reports/${encodeURIComponent(id)}/matches`));
    if (Array.isArray(result)) return result;
    return result?.matches ?? result?.results ?? [];
  },
  create: async (type, payload) => dataOf(await http.post(`/reports/${type.toLowerCase()}`, payload)),
  setStatus: async (id, status) => dataOf(await http.patch(`/reports/${encodeURIComponent(id)}/status`, { status })),
};

export const analyticsApi = {
  overview: async () => dataOf(await http.get('/analytics/overview')),
  hotspots: async () => dataOf(await http.get('/analytics/hotspots')),
  items: async () => dataOf(await http.get('/analytics/items')),
};

export function getErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message
      || (error.code === 'ECONNABORTED'
        ? 'The request took too long. Please try again.'
        : 'We could not reach BLUE right now. Check your connection and try again.');
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
