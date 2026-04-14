import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getAuth } from 'firebase/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Error response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Parking API endpoints - aligned with backend routes
export const parkingAPI = {
  // Auth
  register: (data: any) => apiClient.post('/auth/register', data),
  socialLogin: (data: any) => apiClient.post('/auth/social', data),

  // Zones (backend: /api/zones)
  getZones: (lat?: number, lng?: number, radius?: number) =>
    apiClient.get('/zones', { params: { lat, lng, radius } }),
  getZone: (id: string) => apiClient.get(`/zones/${id}`),

  // Sessions (backend: /api/sessions)
  createSession: (data: any) => apiClient.post('/sessions', data),
  getSession: (id: string) => apiClient.get(`/sessions/${id}`),
  extendSession: (id: string, data: any) =>
    apiClient.put(`/sessions/${id}/extend`, data),
  endSession: (id: string) => apiClient.put(`/sessions/${id}/stop`, {}),
  getSessions: (filters?: any) => apiClient.get('/sessions', { params: filters }),
  getReceipt: (id: string) => apiClient.get(`/sessions/${id}/receipt`),

  // Vehicles (backend: /api/vehicles)
  getVehicles: () => apiClient.get('/vehicles'),
  createVehicle: (data: any) => apiClient.post('/vehicles', data),
  updateVehicle: (id: string, data: any) => apiClient.put(`/vehicles/${id}`, data),
  deleteVehicle: (id: string) => apiClient.delete(`/vehicles/${id}`),

  // Payment Methods (backend: /api/payments)
  getPaymentMethods: () => apiClient.get('/payments/methods'),
  createPaymentMethod: (data: any) => apiClient.post('/payments/methods', data),
  deletePaymentMethod: (id: string) => apiClient.delete(`/payments/methods/${id}`),
  // setup-intent: usato solo se si vuole aggiungere una carta senza ricaricare
  createSetupIntent: () => apiClient.post('/payments/setup-intent'),

  // User Profile (backend: /api/users)
  getProfile: () => apiClient.get('/users/me'),
  updateProfile: (data: any) => apiClient.put('/users/me', data),

  // Analytics (backend: /api/analytics)
  getSpendingData: (period?: string, months?: number) =>
    apiClient.get('/analytics/spending', { params: { period, months } }),
  exportCSV: () => apiClient.get('/analytics/export', { responseType: 'blob' }),

  // Referral (backend: /api/referral)
  getReferralStats: () => apiClient.get('/referral/stats'),
  getReferralCode: () => apiClient.get('/referral/code'),
  applyReferralCode: (code: string) => apiClient.post('/referral/apply', { code }),

  // Wallet (backend: /api/wallet)
  getWalletBalance: () => apiClient.get('/wallet/balance'),
  getWalletTransactions: (page = 1, limit = 20) =>
    apiClient.get('/wallet/transactions', { params: { page, limit } }),
  createTopup: (amount: number) => apiClient.post('/wallet/topup', { amount }),
};
