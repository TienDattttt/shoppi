import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShoppingBag } from "lucide-react";

export default function LoginPage() {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const response = await authService.login({
                identifier: email,
                password: password
            });

            // Map API response to store format
            const user = {
                id: response.user.id,
                email: response.user.email,
                phone: response.user.phone,
                fullName: response.user.fullName,
                role: response.user.role,
                status: response.user.status,
                avatarUrl: response.user.avatarUrl
            };

            login(user, response.accessToken, response.refreshToken);

            // Navigate based on role
            switch (response.user.role) {
                case 'admin':
                    navigate("/admin");
                    break;
                case 'partner':
                    navigate("/partner");
                    break;
                case 'customer':
                    navigate("/customer");
                    break;
                default:
                    navigate("/");
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Sign in to your dashboard to continue
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email address
                            </label>
                            <Input
                                id="email"
                                type="email"
                                required
                                className="mt-1"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Password
                                </label>
                                <div className="text-sm">
                                    <Link to="/forgot-password" className="font-medium text-primary hover:text-primary/90">
                                        Forgot your password?
                                    </Link>
                                </div>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                required
                                className="mt-1"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center">
                        {/* Checkbox isn't imported correctly in some envs, simplifying for now if needed, but trying to use it */}
                        {/* Assuming Checkbox component exists or using native for safety if not sure */}
                        <Checkbox
                            id="remember-me"
                            className="border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                            Remember me
                        </label>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            "Sign in"
                        )}
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">
                                Test Accounts
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs text-center text-gray-500">
                        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100" onClick={() => { setEmail('admin@shoppi.com'); setPassword('123456') }}>
                            <strong>Admin</strong><br />admin@shoppi.com
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100" onClick={() => { setEmail('partner@shoppi.com'); setPassword('123456') }}>
                            <strong>Partner</strong><br />partner@shoppi.com
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
