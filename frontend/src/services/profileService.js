import api from './api';

const PROFILE_URL = '/profile';

export const profileService = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get(PROFILE_URL);
    return response.data;
  },

  // Update profile
  updateProfile: async (profileData) => {
    const response = await api.put(PROFILE_URL, profileData);
    return response.data;
  },

  // Upload profile photo
  uploadProfilePhoto: async (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    
    const response = await api.post(`${PROFILE_URL}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Upload gallery photos
  uploadGalleryPhotos: async (files) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('photos', file);
    });
    
    const response = await api.post(`${PROFILE_URL}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete photo
  deletePhoto: async (photoUrl) => {
    const response = await api.delete(`${PROFILE_URL}/photo`, {
      data: { photoUrl }
    });
    return response.data;
  },

  // ============ HOROSCOPE FIELDS ============
  updateHoroscope: async (horoscopeData) => {
    const response = await api.put(`${PROFILE_URL}/horoscope`, horoscopeData);
    return response.data;
  },

  // ============ FAMILY BACKGROUND FIELDS ============
  updateFamilyBackground: async (familyData) => {
    const response = await api.put(`${PROFILE_URL}/family`, familyData);
    return response.data;
  },

  // ============ SUBSCRIPTION FIELDS ============
  updateSubscription: async (subscriptionData) => {
    const response = await api.put(`${PROFILE_URL}/subscription`, subscriptionData);
    return response.data;
  },

  getSubscriptionPlans: async () => {
    const response = await api.get(`${PROFILE_URL}/subscription/plans`);
    return response.data;
  },

  // ============ DOCUMENTS ============
  uploadDocument: async (file, documentType) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);
    
    const response = await api.post(`${PROFILE_URL}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getDocuments: async () => {
    const response = await api.get(`${PROFILE_URL}/documents`);
    return response.data;
  },

  deleteDocument: async (documentId) => {
    const response = await api.delete(`${PROFILE_URL}/documents/${documentId}`);
    return response.data;
  },

  // Save profile photo adjustments
  saveProfilePhotoAdjustments: async (adjustments) => {
    const response = await api.put(`${PROFILE_URL}/photo/adjustments`, adjustments);
    return response.data;
  },

  // Get profile photo adjustments
  getProfilePhotoAdjustments: async () => {
    const response = await api.get(PROFILE_URL);
    return {
      profilePhotoScale: response.data.user?.profilePhotoScale,
      profilePhotoX: response.data.user?.profilePhotoX,
      profilePhotoY: response.data.user?.profilePhotoY
    };
  },

  // Download profile PDF (uses shared profile API with watermark)
  downloadProfilePdf: async (userId, sanitize = false) => {
    const response = await api.get(`/shared-profile/${userId}`, {
      responseType: 'blob',
      params: { sanitize }
    });
    return response.data;
  },

  // Get page count info for shared profile PDF
  getPageCount: async (userId) => {
    const response = await api.get(`/shared-profile/${userId}/pages`);
    return response.data;
  }
};

export default profileService;
