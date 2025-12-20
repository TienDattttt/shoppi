import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string | null;
    phone: string | null;
    fullName: string;
    name?: string; // Alias for fullName
    role: 'admin' | 'partner' | 'customer' | 'shipper';
    status: string;
    avatarUrl?: string;
    avatar?: string; // Alias for avatarUrl
    gender?: string;
    dateOfBirth?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    login: (user: User, accessToken: string, refreshToken: string) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            refreshToken: null,
            isLoading: false,
            login: (user, accessToken, refreshToken) => set({ 
                user, 
                token: accessToken, 
                refreshToken 
            }),
            logout: () => set({ user: null, token: null, refreshToken: null }),
            updateUser: (updates) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...updates } : null,
                })),
            setToken: (token) => set({ token }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
