import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle, KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface RegisterModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSwitchToLogin: () => void;
}

type Step = 'register' | 'verify' | 'success';

export function RegisterModal({ open, onOpenChange, onSwitchToLogin }: RegisterModalProps) {
    const login = useAuthStore((state) => state.login);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<Step>('register');
    const [error, setError] = useState("");
    const [devOtp, setDevOtp] = useState("");
    const [otp, setOtp] = useState("");
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });

    const identifier = formData.phone || formData.email;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
        setError("");
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }

        // Password: min 8 chars, 1 uppercase, 1 lowercase, 1 number
        if (formData.password.length < 8) {
            setError("Mật khẩu phải có ít nhất 8 ký tự");
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
        if (!passwordRegex.test(formData.password)) {
            setError("Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 số");
            return;
        }

        if (!formData.email && !formData.phone) {
            setError("Vui lòng nhập email hoặc số điện thoại");
            return;
        }

        setIsLoading(true);
        try {
            const response = await authService.registerCustomer({
                fullName: formData.fullName,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                password: formData.password
            });
            
            if (response.otp) {
                setDevOtp(response.otp);
            }
            
            setStep('verify');
            toast.success("Mã OTP đã được gửi!");
        } catch (error: any) {
            const message = error.response?.data?.error?.message || "Đăng ký thất bại.";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (otp.length < 6) {
            setError("Vui lòng nhập mã OTP 6 số");
            return;
        }

        setIsLoading(true);
        try {
            const response = await authService.verifyOTP({
                identifier,
                otp,
                purpose: 'registration'
            });
            
            if (response.user) {
                try {
                    const loginRes = await authService.login({
                        identifier,
                        password: formData.password
                    });
                    login(loginRes.user, loginRes.accessToken, loginRes.refreshToken);
                    toast.success(`Chào mừng ${loginRes.user.fullName}!`);
                    handleClose(false);
                    return;
                } catch {
                    // Auto-login failed, show success
                }
            }
            
            setStep('success');
            toast.success("Xác thực thành công!");
        } catch (error: any) {
            const message = error.response?.data?.error?.message || "Mã OTP không đúng.";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = (open: boolean) => {
        if (!open) {
            setStep('register');
            setError("");
            setOtp("");
            setDevOtp("");
            setFormData({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
        }
        onOpenChange(open);
    };

    const handleBackToLogin = () => {
        handleClose(false);
        onSwitchToLogin();
    };


    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-center font-bold text-shopee-orange">
                        {step === 'register' && "Đăng ký"}
                        {step === 'verify' && "Xác thực OTP"}
                        {step === 'success' && "Thành công!"}
                    </DialogTitle>
                    {step === 'verify' && (
                        <DialogDescription className="text-center">
                            Nhập mã OTP đã gửi đến {identifier}
                        </DialogDescription>
                    )}
                </DialogHeader>

                {step === 'register' && (
                    <>
                        <form onSubmit={handleRegister} className="space-y-4 mt-4">
                            {error && (
                                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Họ và tên</Label>
                                <Input id="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Nguyễn Văn A" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Số điện thoại</Label>
                                <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="0901234567" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Mật khẩu</Label>
                                <Input id="password" type="password" required value={formData.password} onChange={handleChange} placeholder="Tối thiểu 8 ký tự" />
                                <p className="text-xs text-muted-foreground">Gồm chữ hoa, chữ thường và số</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                                <Input id="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} />
                            </div>

                            <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                Đăng ký
                            </Button>
                        </form>

                        <div className="text-center text-sm mt-4 text-muted-foreground">
                            Đã có tài khoản?{" "}
                            <button onClick={onSwitchToLogin} className="text-primary hover:underline font-bold">
                                Đăng nhập
                            </button>
                        </div>
                    </>
                )}

                {step === 'verify' && (
                    <form onSubmit={handleVerifyOTP} className="space-y-4 mt-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                                {error}
                            </div>
                        )}
                        
                        {devOtp && (
                            <div className="p-3 text-sm text-blue-600 bg-blue-50 rounded-lg text-center">
                                <span className="font-medium">Dev Mode:</span> OTP = <code className="font-bold">{devOtp}</code>
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <Label htmlFor="otp">Mã OTP</Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="otp" 
                                    type="text" 
                                    required 
                                    value={otp} 
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    maxLength={6}
                                    className="pl-10 text-center tracking-widest text-lg"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                            Xác thực
                        </Button>

                        <div className="text-center text-sm">
                            <button 
                                type="button"
                                onClick={() => setStep('register')} 
                                className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto"
                            >
                                <ArrowLeft className="h-3 w-3" /> Quay lại
                            </button>
                        </div>
                    </form>
                )}

                {step === 'success' && (
                    <div className="text-center py-6 space-y-4">
                        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <p className="text-muted-foreground">
                            Tài khoản của bạn đã được kích hoạt thành công!
                        </p>
                        <Button onClick={handleBackToLogin} className="w-full">
                            Đăng nhập ngay
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
