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
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RegisterModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSwitchToLogin: () => void;
}

export function RegisterModal({ open, onOpenChange, onSwitchToLogin }: RegisterModalProps) {
    const login = useAuthStore((state) => state.login);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsLoading(true);
        try {
            const data: any = await authService.register({
                name: formData.name,
                email: formData.email,
                password: formData.password
            });
            login(data.user, data.token);
            toast.success("Account created successfully!");
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-center font-bold text-shopee-orange">Register</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" required value={formData.name} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" required value={formData.email} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" required value={formData.password} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input id="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} />
                    </div>

                    <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                        Register
                    </Button>
                </form>

                <div className="text-center text-sm mt-4 text-muted-foreground">
                    Already have an account? {" "}
                    <button onClick={onSwitchToLogin} className="text-primary hover:underline font-bold">
                        Log In
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
