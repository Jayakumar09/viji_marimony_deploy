import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useRealTime } from './RealTimeContext';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { onProfileUpdate, isConnected } = useRealTime();

  // Handle profile updates from real-time events
  useEffect(() => {
    if (onProfileUpdate && user) {
      onProfileUpdate((data) => {
        console.log('[AuthContext] Profile update received:', data);
        // Check if the update is for the current user
        if (data.userId === user.id) {
          // Refresh user data
          fetchFreshUserData();
        }
      });
    }
  }, [onProfileUpdate, user]);

  // Fetch fresh user data
  const fetchFreshUserData = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      console.log('[AuthContext] User data refreshed automatically');
    } catch (error) {
      console.error('[AuthContext] Failed to refresh user data:', error);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        } catch (error) {
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      // Check for validation errors first
      const validationErrors = error.response?.data?.details;
      if (validationErrors && Array.isArray(validationErrors)) {
        const firstError = validationErrors[0];
        return { 
          success: false, 
          error: `${firstError.field}: ${firstError.message}` 
        };
      }
      // Otherwise return the main error
      return { 
        success: false, 
        error: error.response?.data?.error || error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = async (updatedUser) => {
    if (updatedUser) {
      // If specific user data is provided, merge it with existing user
      setUser(prev => prev ? { ...prev, ...updatedUser } : updatedUser);
    } else {
      // Fetch fresh user data from server
      await fetchFreshUserData();
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};