import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form state
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            toast.success("Password reset successfully! Please login with your new password.");
            navigate("/login");
        }, 1500);
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="hidden lg:block bg-shopee-orange/10 relative">
                <div className="absolute inset-0 flex items-center justify-center p-12">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-shopee-orange mb-4">Secure your account</h2>
                        <p className="text-gray-600">Create a strong password to protect your shopping experience.</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center p-8">
                <div className="mx-auto w-full max-w-sm space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-bold">Reset Password</h1>
                        <p className="text-gray-500">Enter your new password below</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm">Confirm New Password</Label>
                            <Input
                                id="confirm"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full bg-shopee-orange hover:bg-shopee-orange-hover" disabled={isLoading}>
                            {isLoading ? "Resetting..." : "Reset Password"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
