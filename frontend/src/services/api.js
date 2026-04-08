import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  'https://viji-marimony-deploy-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const pendingRequests = new Map();

const generateRequestKey = (config) => {
  if (!config || !config.method || !config.url) {
    return Math.random().toString(36);
  }
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
};

api.interceptors.request.use(
  (config) => {
    if (!config || !config.url) return config;
    
    const requestKey = generateRequestKey(config);
    
    if (pendingRequests.has(requestKey)) {
      const controller = pendingRequests.get(requestKey);
      controller.abort();
      pendingRequests.delete(requestKey);
    }
    
    const controller = axios.CancelToken.source();
    config.cancelToken = controller.token;
    pendingRequests.set(requestKey, controller);

    const adminToken = localStorage.getItem('adminToken');
    const userToken = localStorage.getItem('token');
    
    const isAdminRoute = 
      config.url.includes('/admin/') || 
      config.url.includes('/payments/admin/') || 
      config.url.includes('/chat/admin/');
    
    if (adminToken && isAdminRoute) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response && response.config) {
      const requestKey = generateRequestKey(response.config);
      pendingRequests.delete(requestKey);
    }
    return response;
  },
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    if (error && error.config) {
      const requestKey = generateRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }
    return Promise.reject(error);
  }
);

export default api;
