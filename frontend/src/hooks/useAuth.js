import { useAuth as useAuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const { user, loading, login, register, logout, updateUser } = useAuthContext();
  
  return {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateUser
  };
};