import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        // Simulate API
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="border-b pb-4">
                <h1 className="text-xl font-medium">Change Password</h1>
                <p className="text-sm text-gray-500 mt-1">For your account's security, do not share your password with anyone else</p>
            </div>

            <div className="space-y-6 px-4">
                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                    <Label className="text-right text-gray-500">Current Password</Label>
                    <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                    <Label className="text-right text-gray-500">New Password</Label>
                    <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                    <Label className="text-right text-gray-500">Confirm Password</Label>
                    <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-[150px_1fr] gap-4">
                    <div></div>
                    <Button onClick={handleSubmit} className="bg-shopee-orange hover:bg-shopee-orange-hover text-white w-24">
                        Confirm
                    </Button>
                </div>
            </div>
        </div>
    );
}
