import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/auth.service";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";
import api from "@/services/api";

export default function ProfilePage() {
    const { user, updateUser } = useAuthStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Local state for form
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [gender, setGender] = useState("other");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [avatarPreview, setAvatarPreview] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Load user data on mount
    useEffect(() => {
        if (user) {
            setName(user.name || user.fullName || "");
            setEmail(user.email || "");
            setPhone(user.phone || "");
            setGender(user.gender || "other");
            setDateOfBirth(user.dateOfBirth || "");
            setAvatarPreview(user.avatar || user.avatarUrl || "");
        }
    }, [user]);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            toast.error("Vui lòng chọn file ảnh");
            return;
        }
        if (file.size > 1024 * 1024) {
            toast.error("File ảnh không được vượt quá 1MB");
            return;
        }

        setUploading(true);
        try {
            // Upload to server
            const formData = new FormData();
            formData.append('file', file);

            const response = await api.post('/auth/me/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const uploadedUrl = response.data?.data?.url || response.data?.url;
            if (uploadedUrl) {
                setAvatarPreview(uploadedUrl);
                // Update store with new avatar
                if (response.data?.data?.user) {
                    updateUser({
                        avatar: response.data.data.user.avatarUrl,
                        avatarUrl: response.data.data.user.avatarUrl,
                    });
                }
                toast.success("Tải ảnh lên thành công");
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error(error.response?.data?.message || "Không thể tải ảnh lên");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const result = await authService.updateProfile({
                fullName: name,
                gender,
                dateOfBirth: dateOfBirth || undefined,
                avatarUrl: avatarPreview || undefined,
            });

            // Update local store
            if (result.user) {
                updateUser({
                    name: result.user.fullName,
                    fullName: result.user.fullName,
                    avatar: result.user.avatarUrl,
                    avatarUrl: result.user.avatarUrl,
                    gender: result.user.gender,
                    dateOfBirth: result.user.dateOfBirth,
                });
            }

            toast.success("Cập nhật hồ sơ thành công!");
        } catch (error: any) {
            console.error("Update profile error:", error);
            toast.error(error.response?.data?.message || "Không thể cập nhật hồ sơ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="border-b pb-4">
                <h1 className="text-xl font-medium">Hồ Sơ Của Tôi</h1>
                <p className="text-sm text-gray-500 mt-1">Quản lý thông tin hồ sơ để bảo mật tài khoản</p>
            </div>

            <div className="flex flex-col-reverse md:flex-row gap-8">
                {/* Form */}
                <div className="flex-1 space-y-6 max-w-lg">
                    <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                        <Label className="text-right text-gray-500">Tên đăng nhập</Label>
                        <div className="text-sm">{user?.name || user?.email || user?.phone}</div>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                        <Label className="text-right text-gray-500">Tên</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên của bạn" />
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                        <Label className="text-right text-gray-500">Email</Label>
                        <div className="flex gap-2 items-center">
                            <span className="text-sm">{email || "Chưa có"}</span>
                            {/* <button className="text-blue-500 text-sm underline">Thay đổi</button> */}
                        </div>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                        <Label className="text-right text-gray-500">Số điện thoại</Label>
                        <div className="flex gap-2 items-center">
                            <span className="text-sm">{phone ? `******${phone.slice(-2)}` : "Chưa có"}</span>
                            {/* <button className="text-blue-500 text-sm underline">Thay đổi</button> */}
                        </div>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                        <Label className="text-right text-gray-500">Ngày sinh</Label>
                        <Input 
                            type="date" 
                            value={dateOfBirth} 
                            onChange={(e) => setDateOfBirth(e.target.value)} 
                        />
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-start gap-4">
                        <Label className="text-right text-gray-500 pt-2">Giới tính</Label>
                        <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="male" id="male" />
                                <Label htmlFor="male">Nam</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="female" id="female" />
                                <Label htmlFor="female">Nữ</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="other" id="other" />
                                <Label htmlFor="other">Khác</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] gap-4">
                        <div></div>
                        <Button 
                            onClick={handleSave} 
                            className="bg-shopee-orange hover:bg-shopee-orange-hover text-white w-24"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu"}
                        </Button>
                    </div>
                </div>

                {/* Avatar */}
                <div className="w-full md:w-64 flex flex-col items-center justify-center border-l pl-8 gap-4">
                    <div className="relative">
                        <img
                            src={avatarPreview || "https://github.com/shadcn.png"}
                            alt="Avatar"
                            className="h-24 w-24 rounded-full border object-cover"
                        />
                        {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        <Camera className="h-4 w-4 mr-2" />
                        Chọn Ảnh
                    </Button>
                    <div className="text-xs text-gray-400 text-center">
                        Dung lượng file tối đa 1MB<br />
                        Định dạng: .JPEG, .PNG
                    </div>
                </div>
            </div>
        </div>
    );
}
