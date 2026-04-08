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

api.interceptors.request.use(
  (config) => {
    if (!config || !config.url) return config;

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
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default api;
