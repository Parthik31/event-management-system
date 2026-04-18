import axios from 'axios';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error('Network Error: Please check your internet connection.');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    if (status === 401) {
      const shouldSkipRedirect =
        error.config?.skipAuthRedirect ||
        error.config?.url?.includes('/auth/me');

      if (shouldSkipRedirect) {
        return Promise.reject(error);
      }

      if (!window.isLoggingOut && window.location.pathname !== '/login') {
        window.isLoggingOut = true;
        toast.error('Session expired. Please log in again.');

        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    } else if (status === 409) {
      toast.error(data.message || 'Data conflict occurred.');
    } else if (status === 400) {
      toast.error(data.message || 'Invalid request. Please check your inputs.');
    } else if (status >= 500) {
      toast.error('Our servers are currently experiencing issues. Please try again later.');
    }

    return Promise.reject(error);
  }
);

export const resolveMediaUrl = (url) => {
  if (!url) return '/placeholder-image.jpg';
  if (url.startsWith('http')) return url;

  const baseUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
    : 'http://localhost:5000';

  return `${baseUrl}${url}`;
};

export default api;
