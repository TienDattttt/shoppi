import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, ArrowLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setIsSent(true);
            toast.success("Reset link sent to your email");
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Forgot Password?
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {isSent
                            ? "Check your email for the reset link"
                            : "Enter your email address to reset your password"}
                    </p>
                </div>

                {!isSent ? (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email address
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    className="pl-10"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending Link...
                                </>
                            ) : (
                                "Send Reset Link"
                            )}
                        </Button>
                    </form>
                ) : (
                    <div className="mt-8 space-y-6">
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-sm text-green-700 dark:text-green-300 text-center">
                            We have sent a password reset link to <strong>{email}</strong>. Please check your inbox and spam folder.
                        </div>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setIsSent(false)}
                        >
                            Try another email
                        </Button>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <Link to="/login" className="font-medium text-primary hover:text-primary/90 flex items-center justify-center gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
