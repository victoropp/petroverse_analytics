import axios from 'axios';
import { useAuthStore } from './auth';
import apiConfig from './api-config';

// Get dynamic API URL
const API_URL = apiConfig.getAPIUrl();

// Create axios instance with dynamic baseURL
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Update baseURL dynamically when it changes
if (typeof window !== 'undefined') {
  apiConfig.findWorkingUrl().then(url => {
    api.defaults.baseURL = url;
  });
}

// Add auth interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and automatic retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Handle CORS or network errors - try different API URL
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = true;
      console.warn('API request failed, trying fallback URL...');
      
      // Try to find a working URL
      const newUrl = await apiConfig.findWorkingUrl();
      if (newUrl !== api.defaults.baseURL) {
        api.defaults.baseURL = newUrl;
        originalRequest.baseURL = newUrl;
        return api(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

// API functions
export const analyticsAPI = {
  // Get dashboard configuration
  getDashboardConfig: async (dashboardType: string) => {
    const response = await api.get(`/api/v2/dashboard/config/${dashboardType}`);
    return response.data;
  },

  // Query analytics data
  queryAnalytics: async (params: {
    metrics: string[];
    filters: Record<string, any>;
    date_range: { start: string; end: string };
    aggregation?: string;
  }) => {
    const response = await api.post('/api/v2/analytics/query', params);
    return response.data;
  },

  // Get predictions
  getPredictions: async (product: string, horizonDays: number = 30) => {
    const response = await api.post('/api/v2/analytics/predict', {
      product,
      horizon_days: horizonDays,
      confidence_level: 0.95,
    });
    return response.data;
  },

  // Get tenant info
  getTenantInfo: async () => {
    const response = await api.get('/api/v2/tenant/info');
    return response.data;
  },

  // Get date range from database
  getDateRange: async () => {
    const response = await api.get('/api/v2/date-range');
    return response.data;
  },
};

// Filter API functions
export const filterAPI = {
  // Get filter options
  getFilterOptions: async () => {
    const response = await api.get('/api/v2/filters/options');
    return response.data;
  },

  // Validate filters
  validateFilters: async (filters: Record<string, any>) => {
    const response = await api.post('/api/v2/filters/validate', filters);
    return response.data;
  },
};

// Chart API functions  
export const chartAPI = {
  // Get chart data
  getChartData: async (chartId: number, params?: Record<string, any>) => {
    const response = await api.get(`/api/v2/charts/${chartId}`, { params });
    return response.data;
  },

  // Get multiple charts
  getMultipleCharts: async (chartIds: number[], params?: Record<string, any>) => {
    const promises = chartIds.map(id => chartAPI.getChartData(id, params));
    return Promise.all(promises);
  },
};