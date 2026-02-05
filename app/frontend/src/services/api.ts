/**
 * API Service
 *
 * Axios instance configured for API requests
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token, request ID, etc.
api.interceptors.request.use(
  (config) => {
    // Add request ID for tracing
    config.headers['X-Request-ID'] = crypto.randomUUID();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    // Handle specific error codes
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login, etc.
      console.warn('Unauthorized request');
    }

    if (error.response?.status === 429) {
      // Handle rate limiting
      console.warn('Rate limited');
    }

    return Promise.reject(error);
  }
);
