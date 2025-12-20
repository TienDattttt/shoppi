import api from "./api";

export interface LoginCredentials {
    identifier: string; // email or phone
    password: string;
}

export interface RegisterCustomerData {
    email?: string;
    phone?: string;
    password: string;
    fullName: string;
}

export interface RegisterPartnerData {
    email: string;
    phone: string;
    password: string;
    fullName: string;
    businessName: string;
    taxId?: string;
}

export interface OTPVerifyData {
    identifier: string;
    otp: string;
    purpose: 'registration' | 'login' | 'password_reset';
}

export interface PasswordResetData {
    identifier: string;
    otp: string;
    newPassword: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string | null;
        phone: string | null;
        fullName: string;
        role: 'admin' | 'partner' | 'customer' | 'shipper';
        status: string;
        avatarUrl?: string;
    };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export const authService = {
    // Login with email/phone and password
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await api.post("/auth/login", credentials);
        return response.data;
    },

    // Register customer
    registerCustomer: async (data: RegisterCustomerData) => {
        const response = await api.post("/auth/register/customer", data);
        return response.data;
    },

    // Register partner
    registerPartner: async (data: RegisterPartnerData) => {
        const response = await api.post("/auth/register/partner", data);
        return response.data;
    },

    // Verify OTP (for registration, login, password reset)
    verifyOTP: async (data: OTPVerifyData) => {
        const response = await api.post("/auth/verify-otp", data);
        return response.data;
    },

    // Request OTP for login
    requestLoginOTP: async (phone: string) => {
        const response = await api.post("/auth/login/otp/request", { identifier: phone });
        return response.data;
    },

    // Login with OTP
    loginWithOTP: async (phone: string, otp: string): Promise<AuthResponse> => {
        const response = await api.post("/auth/login/otp/verify", { phone, otp });
        return response.data;
    },

    // OAuth login
    loginWithGoogle: async (idToken: string): Promise<AuthResponse> => {
        const response = await api.post("/auth/oauth/google", { idToken });
        return response.data;
    },

    loginWithFacebook: async (accessToken: string): Promise<AuthResponse> => {
        const response = await api.post("/auth/oauth/facebook", { accessToken });
        return response.data;
    },

    // Refresh token
    refreshToken: async (refreshToken: string) => {
        const response = await api.post("/auth/refresh", { refreshToken });
        return response.data;
    },

    // Logout
    logout: async () => {
        const response = await api.post("/auth/logout");
        return response.data;
    },

    // Get current user
    getCurrentUser: async () => {
        const response = await api.get("/auth/me");
        return response.data;
    },

    // Update profile
    updateProfile: async (data: { fullName?: string; gender?: string; dateOfBirth?: string; avatarUrl?: string }) => {
        const response = await api.patch("/auth/me", data);
        return response.data;
    },

    // Get sessions
    getSessions: async () => {
        const response = await api.get("/auth/sessions");
        return response.data;
    },

    // Terminate session
    terminateSession: async (sessionId: string) => {
        const response = await api.delete(`/auth/sessions/${sessionId}`);
        return response.data;
    },

    // Request password reset
    requestPasswordReset: async (identifier: string) => {
        const response = await api.post("/auth/password/reset/request", { identifier });
        return response.data;
    },

    // Reset password with OTP
    resetPassword: async (data: PasswordResetData) => {
        const response = await api.post("/auth/password/reset/verify", data);
        return response.data;
    },

    // Admin: Approve account
    approveAccount: async (userId: string) => {
        const response = await api.post(`/auth/admin/approve/${userId}`);
        return response.data;
    },

    // Admin: Reject account
    rejectAccount: async (userId: string, reason?: string) => {
        const response = await api.post(`/auth/admin/reject/${userId}`, { reason });
        return response.data;
    },
};
