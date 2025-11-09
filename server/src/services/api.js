cat > services/api.js << 'EOF'
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  signup: (email, password, name) => api.post('/auth/signup', { email, password, name }),
  getProfile: () => api.get('/auth/profile'),
};

export const captionAPI = {
  generateCaptions: (formData) => api.post('/captions/generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getUsage: () => api.get('/captions/usage'),
};

export const stripeAPI = {
  createCheckout: (priceId) => api.post('/stripe/create-checkout', { priceId }),
  createPortal: () => api.post('/stripe/create-portal'),
  getSubscription: () => api.get('/stripe/subscription'),
};

export default api;
EOF