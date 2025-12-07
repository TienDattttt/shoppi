import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export default function ProfilePage() {
    const { user, updateUser } = useAuthStore();

    // Local state for form
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [phone, setPhone] = useState("0912345678");
    const [gender, setGender] = useState("male");

    // Mock Avatar Upload
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "https://github.com/shadcn.png");

    const handleSave = () => {
        // Simulate API call
        setTimeout(() => {
            if (user) {
                updateUser({ name, avatar: avatarPreview });
                toast.success("Profile updated successfully!");
            }
        }, 500);
    };

    return (
        <div className="space-y-6">
            <div className="border-b pb-4">
                <h1 className="text-xl font-medium">My Profile</h1>
                <p className="text-sm text-gray-500 mt-1">Manage and protect your account</p>
            </div>

            <div className="flex flex-col-reverse md:flex-row gap-8">
                {/* Form */}
                <div className="flex-1 space-y-6 max-w-lg">
                    <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                        <Label className="text-right text-gray-500">Username</Label>
                        <div>{user?.name}</div>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                        <Label className="text-right text-gray-500">Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                        <Label className="text-right text-gray-500">Email</Label>
                        <div className="flex gap-2 items-center">
                            <span>{email}</span>
                            <button className="text-blue-500 text-sm underline">Change</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                        <Label className="text-right text-gray-500">Phone</Label>
                        <div className="flex gap-2 items-center">
                            <span>********78</span>
                            <button className="text-blue-500 text-sm underline">Change</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-start gap-4">
                        <Label className="text-right text-gray-500 pt-2">Gender</Label>
                        <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="male" id="male" />
                                <Label htmlFor="male">Male</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="female" id="female" />
                                <Label htmlFor="female">Female</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="other" id="other" />
                                <Label htmlFor="other">Other</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] gap-4">
                        <div></div>
                        <Button onClick={handleSave} className="bg-shopee-orange hover:bg-shopee-orange-hover text-white w-24">
                            Save
                        </Button>
                    </div>
                </div>

                {/* Avatar */}
                <div className="w-full md:w-64 flex flex-col items-center justify-center border-l pl-8 gap-4">
                    <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="h-24 w-24 rounded-full border object-cover"
                    />
                    <Button variant="outline" size="sm">Select Image</Button>
                    <div className="text-xs text-gray-400 text-center">
                        File size: max. 1MB<br />
                        File extension: .JPEG, .PNG
                    </div>
                </div>
            </div>
        </div>
    );
}
