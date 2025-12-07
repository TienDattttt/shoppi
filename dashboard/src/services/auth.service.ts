import api from "./api";

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    phone?: string;
}

export const authService = {
    login: async (credentials: LoginCredentials) => {
        // Real API call would be:
        // const response = await api.post("/auth/login", credentials);
        // return response.data;

        // Mock for now to unblock UI dev
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (credentials.email === "fail@test.com") {
                    reject({ response: { data: { message: "Invalid credentials" } } });
                } else {
                    resolve({
                        user: {
                            id: "u123",
                            name: "Nguyen Van Customer",
                            email: credentials.email,
                            role: "user",
                            avatar: "https://github.com/shadcn.png"
                        },
                        token: "mock-customer-token-123"
                    });
                }
            }, 1000);
        });
    },

    register: async (data: RegisterData) => {
        // const response = await api.post("/auth/register", data);
        // return response.data;

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    user: {
                        id: "u124",
                        name: data.name,
                        email: data.email,
                        role: "user"
                    },
                    token: "mock-new-token-456"
                });
            }, 1000);
        });
    },

    forgotPassword: async (email: string) => {
        // return api.post("/auth/forgot-password", { email });
        return new Promise((resolve) => {
            setTimeout(() => resolve({ message: "Reset link sent" }), 1000);
        });
    }
};
