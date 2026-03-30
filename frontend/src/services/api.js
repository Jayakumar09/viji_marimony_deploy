import axios from 'axios';

// API Base URL - Configure for production
// For Render backend: https://viji-marimony-deploy-backend.onrender.com/api
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://viji-marimony-deploy-backend.onrender.com/api' 
    : 'http://localhost:5001/api');

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Check for admin token first (for admin API calls)
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');
    const userToken = localStorage.getItem('token');
    
    // Use admin token for admin API calls (including /payments/admin/ and /chat/admin/), user token for regular calls
    if (adminToken && (config.url.includes('/admin/') || config.url.includes('/payments/admin/') || config.url.includes('/chat/admin/'))) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      // Add admin user info for chat routes
      if (adminUser && config.url.includes('/chat/admin/')) {
        config.headers['x-admin-user'] = adminUser;
        config.headers['x-admin-token'] = adminToken;
      }
    } else if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-redirect on 401, let the component handle it
    // This prevents redirect loops when token is invalid
    console.error('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default api;