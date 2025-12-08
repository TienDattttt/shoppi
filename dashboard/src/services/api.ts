import axios from 'axios';

// Backend API base URL (matches backend routes)
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
            try {
                const { state } = JSON.parse(authStorage);
                if (state?.token) {
                    config.headers.Authorization = `Bearer ${state.token}`;
                }
            } catch (e) {
                console.error('Failed to parse auth storage:', e);
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors and extract data
api.interceptors.response.use(
    (response) => {
        // Backend wraps response in { success: true, data: {...} }
        // Extract the data for convenience
        if (response.data && response.data.success && response.data.data) {
            response.data = response.data.data;
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 Unauthorized - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const authStorage = localStorage.getItem('auth-storage');
                if (authStorage) {
                    const { state } = JSON.parse(authStorage);
                    if (state?.refreshToken) {
                        const response = await axios.post(
                            `${api.defaults.baseURL}/auth/refresh`,
                            { refreshToken: state.refreshToken }
                        );
                        
                        const { accessToken } = response.data;
                        
                        // Update stored token
                        const newState = { ...state, token: accessToken };
                        localStorage.setItem('auth-storage', JSON.stringify({ state: newState }));
                        
                        // Retry original request
                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                // Refresh failed - clear auth and redirect to login
                localStorage.removeItem('auth-storage');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;
