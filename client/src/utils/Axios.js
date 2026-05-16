import axios from 'axios';
import { toast } from 'react-hot-toast';

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRY_DELAY_MS = 500;
const inflightGetRequests = new Map();
const responseCache = new Map();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cloneData = (value) => {
  if (value == null) return value;

  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const serializeParams = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, item));
        return;
      }

      searchParams.append(key, value);
    });

  return searchParams.toString();
};

const buildRequestKey = (url, config = {}) => {
  const method = (config.method || 'get').toLowerCase();
  const paramsString = serializeParams(config.params);
  return `${method}:${url}${paramsString ? `?${paramsString}` : ''}`;
};

const getCachedResponse = (cacheKey) => {
  const entry = responseCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(cacheKey);
    return null;
  }

  return {
    ...entry.response,
    data: cloneData(entry.response.data)
  };
};

const setCachedResponse = (cacheKey, response, cacheTTL) => {
  if (!cacheTTL || cacheTTL <= 0) {
    return;
  }

  responseCache.set(cacheKey, {
    response: {
      data: cloneData(response.data),
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    },
    expiresAt: Date.now() + cacheTTL
  });
};

const shouldRetryRequest = (error) => {
  const method = error.config?.method?.toLowerCase();
  if (method && method !== 'get') {
    return false;
  }

  if (error.code === 'ERR_CANCELED') {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return [408, 425, 429, 500, 502, 503, 504].includes(error.response.status);
};

// GLOBAL NETWORK DETECTOR
// Changes localhost to the phone's IP address automatically
const getBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  const host = window.location.hostname;
  if (host.match(/^(192\.168\.|172\.|10\.)/)) {
    return `http://${host}:5000/api/v1`; 
  }
  
  return 'http://localhost:5000/api/v1';
};

const baseURL = getBaseUrl();

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const retryCount = Number(config.__retryCount || 0);
    const maxRetries = Number(config.retryAttempts ?? 2);

    if (shouldRetryRequest(error) && retryCount < maxRetries) {
      config.__retryCount = retryCount + 1;
      const retryDelay = Number(config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS) * config.__retryCount;
      await wait(retryDelay);
      return api(config);
    }

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
          window.isLoggingOut = false; 
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

export const getCachedApi = async (url, config = {}, options = {}) => {
  const {
    cacheTTL = 30000,
    preferCacheOnError = true,
    forceRefresh = false,
    dedupe = true
  } = options;
  const requestConfig = { ...config, method: 'get' };
  const cacheKey = buildRequestKey(url, requestConfig);

  if (!forceRefresh) {
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  if (dedupe && inflightGetRequests.has(cacheKey)) {
    return inflightGetRequests.get(cacheKey);
  }

  const requestPromise = api
    .get(url, config)
    .then((response) => {
      setCachedResponse(cacheKey, response, cacheTTL);
      return response;
    })
    .catch((error) => {
      if (preferCacheOnError) {
        const cachedResponse = getCachedResponse(cacheKey);
        if (cachedResponse) {
          return cachedResponse;
        }
      }

      throw error;
    })
    .finally(() => {
      inflightGetRequests.delete(cacheKey);
    });

  if (dedupe) {
    inflightGetRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
};

export const clearApiCache = (matcher) => {
  for (const key of responseCache.keys()) {
    if (!matcher || matcher(key)) {
      responseCache.delete(key);
    }
  }
};

export const resolveMediaUrl = (url) => {
  if (!url) return '/placeholder-image.jpg';
  if (url.startsWith('http') || url.startsWith('data:')) return url;

  const base = baseURL.replace('/api/v1', '');
  return `${base}${url}`;
};

export default api;
