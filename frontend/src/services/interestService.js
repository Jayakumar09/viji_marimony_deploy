import api from './api';

export const interestService = {
  // Send interest
  sendInterest: async (receiverId, message) => {
    const response = await api.post('/interest', { receiverId, message });
    return response.data;
  },

  // Get received interests
  getReceivedInterests: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await api.get(`/interest/received?${params.toString()}`);
    return response.data;
  },

  // Get sent interests
  getSentInterests: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await api.get(`/interest/sent?${params.toString()}`);
    return response.data;
  },

  // Respond to interest (accept/reject)
  respondToInterest: async (interestId, status, message) => {
    const response = await api.put(`/interest/${interestId}/respond`, { 
      status, 
      message 
    });
    return response.data;
  },

  // Get interest statistics
  getInterestStats: async () => {
    const response = await api.get('/interest/stats');
    return response.data;
  }
};

export default interestService;