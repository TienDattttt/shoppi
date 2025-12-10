import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Store, CheckCircle, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");
    
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        businessName: "",
        taxId: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự");
            setIsLoading(false);
            return;
        }

        try {
            await authService.registerPartner({
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                businessName: formData.businessName,
                taxId: formData.taxId || undefined,
            });

            setIsSuccess(true);
        } catch (err: any) {
            console.error('Register error:', err);
            const message = err.response?.data?.error?.message || err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    // Success screen
    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="w-full max-w-md space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-center">
                    <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Đăng ký thành công!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Tài khoản của bạn đã được tạo và đang chờ Admin phê duyệt. 
                        Bạn sẽ nhận được thông báo qua email khi tài khoản được kích hoạt.
                    </p>
                    <div className="pt-4 space-y-3">
                        <Button onClick={() => navigate("/login")} className="w-full">
                            Đăng nhập
                        </Button>
                        <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                            Về trang chủ
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
            <div className="w-full max-w-lg space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Store className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Đăng ký Partner
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Tạo tài khoản để bắt đầu bán hàng trên Shoppi
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Personal Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
                            Thông tin cá nhân
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Họ và tên <span className="text-red-500">*</span>
                            </label>
                            <Input
                                name="fullName"
                                required
                                className="mt-1"
                                placeholder="Nguyễn Văn A"
                                value={formData.fullName}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    name="email"
                                    type="email"
                                    required
                                    className="mt-1"
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Số điện thoại <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    name="phone"
                                    type="tel"
                                    required
                                    className="mt-1"
                                    placeholder="0901234567"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Business Info */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
                            Thông tin doanh nghiệp
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Tên cửa hàng / Doanh nghiệp <span className="text-red-500">*</span>
                            </label>
                            <Input
                                name="businessName"
                                required
                                className="mt-1"
                                placeholder="Cửa hàng ABC"
                                value={formData.businessName}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Mã số thuế (không bắt buộc)
                            </label>
                            <Input
                                name="taxId"
                                className="mt-1"
                                placeholder="0123456789"
                                value={formData.taxId}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
                            Mật khẩu
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Mật khẩu <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    name="password"
                                    type="password"
                                    required
                                    className="mt-1"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Xác nhận mật khẩu <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="mt-1"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang đăng ký...
                                </>
                            ) : (
                                "Đăng ký"
                            )}
                        </Button>
                    </div>

                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Đã có tài khoản?{" "}
                        <Link to="/login" className="font-medium text-primary hover:text-primary/90">
                            Đăng nhập
                        </Link>
                    </p>
                </form>

                <Link 
                    to="/" 
                    className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                    <ArrowLeft className="h-4 w-4" /> Về trang chủ
                </Link>
            </div>
        </div>
    );
}
