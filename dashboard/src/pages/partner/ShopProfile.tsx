import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressPicker } from "@/components/partner/AddressPicker";
import { OperatingHoursEditor } from "@/components/partner/OperatingHoursEditor";
import { ImagePlus, Upload } from "lucide-react";

export default function ShopProfile() {
    const [city, setCity] = useState("hcm");
    const [district, setDistrict] = useState("d1");
    const [ward, setWard] = useState("Bến Nghé");
    const [hours, setHours] = useState({});

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Hồ sơ cửa hàng</h1>
                <p className="text-muted-foreground mt-1">Quản lý thông tin hiển thị của shop</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-1 space-y-6">
                    {/* Logo Section */}
                    <Card className="shadow-premium border-border/50">
                        <CardHeader>
                            <CardTitle className="text-base">Logo Shop</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <div className="h-32 w-32 rounded-full bg-muted border-4 border-background shadow-lg mb-4 flex items-center justify-center text-muted-foreground overflow-hidden relative group cursor-pointer">
                                <span className="z-10 group-hover:opacity-0 transition-opacity">Logo</span>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="text-white h-6 w-6" />
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="w-full">Thay đổi Logo</Button>
                        </CardContent>
                    </Card>

                    {/* Banner Section */}
                    <Card className="shadow-premium border-border/50">
                        <CardHeader>
                            <CardTitle className="text-base">Banner Shop</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <div className="h-24 w-full rounded-lg bg-muted border-2 border-dashed border-border mb-4 flex items-center justify-center text-muted-foreground overflow-hidden relative group cursor-pointer">
                                <span className="z-10 group-hover:opacity-0 transition-opacity flex items-center gap-2">
                                    <ImagePlus className="h-4 w-4" /> Banner
                                </span>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="text-white h-6 w-6" />
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="w-full">Thay đổi Banner</Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="col-span-1 lg:col-span-2 space-y-6">
                    <Card className="shadow-premium border-border/50">
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

                            {/* Contact Info */}
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

                            {/* Address Section */}
                            <div className="space-y-2 pt-2">
                                <Label className="text-base font-semibold">Địa chỉ kho hàng</Label>
                                <AddressPicker
                                    city={city}
                                    district={district}
                                    ward={ward}
                                    onCityChange={setCity}
                                    onDistrictChange={setDistrict}
                                    onWardChange={setWard}
                                />
                                <div className="grid gap-2 mt-2">
                                    <Label htmlFor="street">Số nhà, Tên đường</Label>
                                    <Input id="street" defaultValue="123 Nguyen Hue" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-premium border-border/50">
                        <CardHeader>
                            <CardTitle>Thời gian hoạt động</CardTitle>
                            <CardDescription>Cấu hình khung giờ mở cửa để khách hàng biết</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OperatingHoursEditor value={hours} onChange={setHours} />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline">Hủy bỏ</Button>
                        <Button>Lưu thay đổi</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
