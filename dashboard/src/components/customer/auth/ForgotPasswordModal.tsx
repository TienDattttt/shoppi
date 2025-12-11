import { useState } from "react";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, CheckCircle, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface ForgotPasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSwitchToLogin: () => void;
}

type Step = 'request' | 'verify' | 'success';

export function ForgotPasswordModal({ open, onOpenChange, onSwitchToLogin }: ForgotPasswordModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<Step>('request');
    const [identifier, setIdentifier] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            await authService.requestPasswordReset(identifier);
            setStep('verify');
            toast.success("Mã OTP đã được gửi!");
        } catch (err: any) {
            const message = err.response?.data?.error?.message || "Không thể gửi mã OTP. Vui lòng thử lại.";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }

        if (newPassword.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }

        setIsLoading(true);
        try {
            await authService.resetPassword({
                identifier,
                otp,
                newPassword
            });
            setStep('success');
            toast.success("Đặt lại mật khẩu thành công!");
        } catch (err: any) {
            const message = err.response?.data?.error?.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = (open: boolean) => {
        if (!open) {
            setStep('request');
            setIdentifier("");
            setOtp("");
            setNewPassword("");
            setConfirmPassword("");
            setError("");
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
                        {step === 'success' ? 'Thành công!' : 'Quên mật khẩu'}
                    </DialogTitle>
                    {step === 'request' && (
                        <DialogDescription className="text-center">
                            Nhập email hoặc số điện thoại để nhận mã OTP
                        </DialogDescription>
                    )}
                    {step === 'verify' && (
                        <DialogDescription className="text-center">
                            Nhập mã OTP và mật khẩu mới
                        </DialogDescription>
                    )}
                </DialogHeader>

                {step === 'request' && (
                    <form onSubmit={handleRequestOTP} className="space-y-4 mt-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="identifier">Email hoặc Số điện thoại</Label>
                            <Input 
                                id="identifier" 
                                type="text" 
                                required 
                                value={identifier} 
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="email@example.com hoặc 0901234567"
                            />
                        </div>

                        <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                            Gửi mã OTP
                        </Button>

                        <div className="text-center text-sm">
                            <button 
                                type="button"
                                onClick={handleBackToLogin} 
                                className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto"
                            >
                                <ArrowLeft className="h-3 w-3" /> Quay lại Đăng nhập
                            </button>
                        </div>
                    </form>
                )}

                {step === 'verify' && (
                    <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                                {error}
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
                                    className="pl-10 text-center tracking-widest"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Mật khẩu mới</Label>
                            <Input 
                                id="newPassword" 
                                type="password" 
                                required 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                            <Input 
                                id="confirmPassword" 
                                type="password" 
                                required 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                            Đặt lại mật khẩu
                        </Button>

                        <div className="text-center text-sm">
                            <button 
                                type="button"
                                onClick={() => setStep('request')} 
                                className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto"
                            >
                                <ArrowLeft className="h-3 w-3" /> Thử email khác
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
                            Mật khẩu của bạn đã được đặt lại thành công!
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
