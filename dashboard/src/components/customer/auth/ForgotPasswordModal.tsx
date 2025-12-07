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
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface ForgotPasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSwitchToLogin: () => void;
}

export function ForgotPasswordModal({ open, onOpenChange, onSwitchToLogin }: ForgotPasswordModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await authService.forgotPassword(email);
            setSent(true);
            toast.success("Reset link sent to your email");
        } catch (error) {
            toast.error("Failed to send reset link");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-center font-bold text-shopee-orange">Reset Password</DialogTitle>
                    <DialogDescription className="text-center">
                        Enter your email to receive a password reset link.
                    </DialogDescription>
                </DialogHeader>

                {!sent ? (
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>

                        <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                            Send Link
                        </Button>
                    </form>
                ) : (
                    <div className="text-center py-4 space-y-4">
                        <p className="text-green-600 font-medium">Check your email for the reset link!</p>
                        <Button variant="outline" onClick={onSwitchToLogin}>Return to Login</Button>
                    </div>
                )}

                {!sent && (
                    <div className="text-center text-sm mt-4">
                        <button onClick={onSwitchToLogin} className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto">
                            <ArrowLeft className="h-3 w-3" /> Back to Login
                        </button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
