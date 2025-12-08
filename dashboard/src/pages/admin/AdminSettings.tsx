import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";

export default function AdminSettings() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [siteName, setSiteName] = useState("Shoppi");
    const [contactEmail, setContactEmail] = useState("contact@shoppi.com");
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [autoApprove, setAutoApprove] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await api.get('/admin/settings');
            const settings = response.data;
            setSiteName(settings.site_name || "Shoppi");
            setContactEmail(settings.contact_email || "contact@shoppi.com");
            setMaintenanceMode(settings.maintenance_mode || false);
            setAutoApprove(settings.auto_approve_products !== false);
        } catch (error) {
            console.error('Load settings error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.patch('/admin/settings', {
                site_name: siteName,
                contact_email: contactEmail,
                maintenance_mode: maintenanceMode,
                auto_approve_products: autoApprove,
            });
            toast.success("Đã lưu cài đặt thành công!");
        } catch (error: any) {
            console.error('Save settings error:', error);
            toast.error(error.response?.data?.error?.message || "Không thể lưu cài đặt");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Cài đặt hệ thống</h1>
                <p className="text-muted-foreground mt-1">Cấu hình tham số toàn sàn</p>
            </div>

            <div className="grid gap-6">
                <Card className="shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Thông tin chung</CardTitle>
                        <CardDescription>Thông tin hiển thị nền tảng</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="siteName">Tên sàn thương mại</Label>
                            <Input 
                                id="siteName" 
                                value={siteName}
                                onChange={(e) => setSiteName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contactEmail">Email liên hệ</Label>
                            <Input 
                                id="contactEmail" 
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Cấu hình vận hành</CardTitle>
                        <CardDescription>Các thiết lập quan trọng</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Bảo trì hệ thống</Label>
                                <p className="text-sm text-muted-foreground">Tạm ngưng truy cập để bảo trì</p>
                            </div>
                            <Switch 
                                checked={maintenanceMode}
                                onCheckedChange={setMaintenanceMode}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Duyệt tự động</Label>
                                <p className="text-sm text-muted-foreground">Tự động duyệt sản phẩm từ shop uy tín</p>
                            </div>
                            <Switch 
                                checked={autoApprove}
                                onCheckedChange={setAutoApprove}
                            />
                        </div>
                        <div className="pt-4">
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    "Lưu thay đổi"
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
