import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ShopProfile() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Hồ sơ cửa hàng</h1>
                <p className="text-muted-foreground mt-1">Quản lý thông tin hiển thị của shop</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1 shadow-premium border-border/50 h-fit">
                    <CardContent className="pt-6 flex flex-col items-center">
                        <div className="h-32 w-32 rounded-full bg-muted border-4 border-background shadow-lg mb-4 flex items-center justify-center text-muted-foreground">
                            Logo
                        </div>
                        <Button variant="outline" size="sm">Thay đổi Logo</Button>
                    </CardContent>
                </Card>

                <Card className="col-span-1 lg:col-span-2 shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Thông tin cơ bản</CardTitle>
                        <CardDescription>Thông tin này sẽ hiển thị trên trang chủ của shop</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="shopName">Tên cửa hàng</Label>
                            <Input id="shopName" defaultValue="Tech Store Official" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="desc">Mô tả giới thiệu</Label>
                            <Textarea id="desc" className="min-h-[100px]" defaultValue="Chuyên cung cấp các sản phẩm công nghệ chính hãng..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Số điện thoại</Label>
                                <Input id="phone" defaultValue="0901234567" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" defaultValue="support@techstore.com" />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">Địa chỉ kho hàng</Label>
                            <Input id="address" defaultValue="123 Nguyen Hue, Quan 1, TP.HCM" />
                        </div>
                        <div className="pt-4 flex justify-end">
                            <Button>Lưu thay đổi</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
