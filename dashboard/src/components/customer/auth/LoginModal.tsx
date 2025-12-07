import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Facebook, Mail } from "lucide-react";
import { toast } from "sonner";

interface LoginModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSwitchToRegister: () => void;
    onSwitchToForgot: () => void;
}

export function LoginModal({ open, onOpenChange, onSwitchToRegister, onSwitchToForgot }: LoginModalProps) {
    const login = useAuthStore((state) => state.login);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const data: any = await authService.login({ email, password });
            login(data.user, data.token);
            toast.success(`Welcome back, ${data.user.name}!`);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-center font-bold text-shopee-orange">Log In</DialogTitle>
                    <DialogDescription className="text-center">
                        Discover your favorite products today.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email or Phone</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="user@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="remember" />
                            <label htmlFor="remember" className="text-muted-foreground cursor-pointer">Remember me</label>
                        </div>
                        <button
                            type="button"
                            onClick={onSwitchToForgot}
                            className="text-primary hover:underline font-medium"
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                        Log In
                    </Button>
                </form>

                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" type="button"><Facebook className="mr-2 h-4 w-4 text-blue-600" /> Facebook</Button>
                    <Button variant="outline" type="button"><Mail className="mr-2 h-4 w-4 text-red-500" /> Google</Button>
                </div>

                <div className="text-center text-sm mt-4 text-muted-foreground">
                    New to Shoppi? {" "}
                    <button onClick={onSwitchToRegister} className="text-primary hover:underline font-bold">
                        Register
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
