import api from './api';

export const messageService = {
  // Send message
  sendMessage: async (receiverId, content) => {
    const response = await api.post('/message', { receiverId, content });
    return response.data;
  },

  // Get conversations list
  getConversations: async () => {
    const response = await api.get('/message/conversations');
    return response.data;
  },

  // Get messages with specific user
  getMessages: async (userId, page = 1) => {
    const response = await api.get(`/message/${userId}?page=${page}`);
    return response.data;
  },

  // Mark messages as read
  markAsRead: async (userId) => {
    const response = await api.put(`/message/${userId}/read`);
    return response.data;
  },

  // Get unread message count
  getUnreadCount: async () => {
    const response = await api.get('/message/unread/count');
    return response.data;
  }
};

export default messageService;