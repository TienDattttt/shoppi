import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, ArrowLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            await authService.requestPasswordReset(email);
            setIsSent(true);
            toast.success("Mã OTP đã được gửi đến email của bạn");
        } catch (err: any) {
            const message = err.response?.data?.error?.message || "Không thể gửi yêu cầu. Vui lòng thử lại.";
            setError(message);
            toast.error(message);
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
                        Quên mật khẩu?
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {isSent
                            ? "Kiểm tra email để lấy mã OTP"
                            : "Nhập email hoặc số điện thoại để đặt lại mật khẩu"}
                    </p>
                </div>

                {!isSent ? (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                                {error}
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email hoặc Số điện thoại
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <Input
                                    id="email"
                                    type="text"
                                    required
                                    className="pl-10"
                                    placeholder="email@example.com hoặc 0901234567"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang gửi...
                                </>
                            ) : (
                                "Gửi mã OTP"
                            )}
                        </Button>
                    </form>
                ) : (
                    <div className="mt-8 space-y-6">
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-sm text-green-700 dark:text-green-300 text-center">
                            Mã OTP đã được gửi đến <strong>{email}</strong>. Vui lòng kiểm tra hộp thư đến và thư rác.
                        </div>
                        <Link to={`/reset-password?identifier=${encodeURIComponent(email)}`}>
                            <Button className="w-full">
                                Nhập mã OTP
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setIsSent(false)}
                        >
                            Thử email khác
                        </Button>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <Link to="/login" className="font-medium text-primary hover:text-primary/90 flex items-center justify-center gap-2">
                        <ArrowLeft className="h-4 w-4" /> Quay lại Đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    );
}
