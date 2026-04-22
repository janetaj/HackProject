import axios from 'axios';
import { API_CONFIG } from '../config/api.config';

// Manage token in memory or localStorage
const getAccessToken = () => localStorage.getItem('access-token');

export const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config?._retry) {
      error.config._retry = true;
      try {
        // Implement token refresh logic here if applicable
        // Or simply trigger a logout
        // const newToken = await refreshAccessToken();
        // error.config.headers.Authorization = `Bearer ${newToken}`;
        // return apiClient(error.config);
      } catch (refreshError) {
        // Redirect to login or logout
        localStorage.removeItem('access-token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
