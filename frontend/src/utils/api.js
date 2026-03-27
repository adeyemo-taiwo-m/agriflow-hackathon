import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://agriflow-48541bc023cd.herokuapp.com/api/v1',
  withCredentials: true,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const PUBLIC_PAGES = ['/auth', '/agriflow-controls-5592/login', '/', '/farms'];
const AUTH_BYPASS_ENDPOINTS = ['/auth/login', '/auth/signup', '/auth/admin/login', '/auth/renew-access-token'];
let isRefreshing = false;
let failedQueue = [];
let hasRefreshFailed = false;
let hasForcedRedirect = false;

const shouldBypassAuthRefresh = (url = '') => {
  return AUTH_BYPASS_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

const isPublicPage = () => {
  return PUBLIC_PAGES.includes(window.location.pathname);
};

const redirectToAuthOnce = () => {
  if (hasForcedRedirect || isPublicPage()) return;
  hasForcedRedirect = true;
  window.location.assign('/auth');
};

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    const requestUrl = response?.config?.url || '';

    // Successful auth lifecycle calls mean session recovery worked.
    if (shouldBypassAuthRefresh(requestUrl)) {
      hasRefreshFailed = false;
      hasForcedRedirect = false;
    }

    return response;
  },
  async (error) => {
    const originalRequest = error?.config || {};
    const requestUrl = originalRequest?.url || '';

    // If 401 and we haven't already tried retrying this exact request
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Session is known to be expired/revoked. Stop retrying refresh globally.
      if (hasRefreshFailed) {
        redirectToAuthOnce();
        return Promise.reject(error);
      }

      // Avoid looping if the renew endpoint itself fails with 401
      if (requestUrl.includes('/auth/renew-access-token')) {
        hasRefreshFailed = true;
        processQueue(error, null);
        redirectToAuthOnce();
        return Promise.reject(error);
      }

      // Login/signup endpoints should return their own errors directly.
      if (shouldBypassAuthRefresh(requestUrl)) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/renew-access-token');
        isRefreshing = false;
        hasRefreshFailed = false;
        processQueue(null);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;
        const refreshStatus = err?.response?.status;

        // Only force logout when backend explicitly says the session is invalid.
        if (refreshStatus === 401 || refreshStatus === 403) {
          hasRefreshFailed = true;
          redirectToAuthOnce();
        }
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
