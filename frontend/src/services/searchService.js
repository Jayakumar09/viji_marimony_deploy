import api from './api';

export const searchService = {
  // Search profiles with filters
  searchProfiles: async (filters) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await api.get(`/search?${params.toString()}`);
    return response.data;
  },

  // Get recommended profiles
  getRecommendedProfiles: async (limit = 10) => {
    const response = await api.get(`/search/recommended?limit=${limit}`);
    return response.data;
  },

  // Get search filter options
  getSearchFilters: async () => {
    const response = await api.get('/search/filters');
    return response.data;
  },

  // Get specific profile by ID
  getProfileById: async (profileId) => {
    const response = await api.get(`/search/${profileId}`);
    return response.data;
  }
};

export default searchService;