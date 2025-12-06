import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function AdminSettings() {
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
                            <Input id="siteName" defaultValue="Shoppi" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contactEmail">Email liên hệ</Label>
                            <Input id="contactEmail" defaultValue="contact@shoppi.com" />
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
                            <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Duyệt tự động</Label>
                                <p className="text-sm text-muted-foreground">Tự động duyệt sản phẩm từ shop uy tín</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="pt-4">
                            <Button>Lưu thay đổi</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
