import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Refreshed import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PartnerSettings() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Cài đặt tài khoản</h1>
                <p className="text-muted-foreground mt-1">Tùy chỉnh thông tin cá nhân và thông báo</p>
            </div>

            <div className="grid gap-6">
                <Card className="shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Thông báo</CardTitle>
                        <CardDescription>Chọn cách bạn muốn nhận thông báo từ sàn</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Thông báo đơn hàng mới</Label>
                                <p className="text-sm text-muted-foreground">Nhận email khi có đơn hàng mới phát sinh</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Thông báo tin nhắn</Label>
                                <p className="text-sm text-muted-foreground">Nhận noti khi khách hàng nhắn tin</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Bảo mật</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Mật khẩu hiện tại</Label>
                            <Input type="password" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Mật khẩu mới</Label>
                            <Input type="password" />
                        </div>
                        <div className="pt-2">
                            <Button variant="outline">Đổi mật khẩu</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
