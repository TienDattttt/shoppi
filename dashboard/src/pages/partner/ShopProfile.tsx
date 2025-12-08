import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressPicker } from "@/components/partner/AddressPicker";
import { OperatingHoursEditor } from "@/components/partner/OperatingHoursEditor";
import { ImagePlus, Upload, Loader2 } from "lucide-react";
import { shopService } from "@/services/shop.service";
import { toast } from "sonner";

export default function ShopProfile() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [shop, setShop] = useState<any>(null);
    
    // Form fields
    const [shopName, setShopName] = useState("");
    const [description, setDescription] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [district, setDistrict] = useState("");
    const [ward, setWard] = useState("");
    const [hours, setHours] = useState({});
    
    // Image states
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);
    
    const logoInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadShop();
    }, []);

    const loadShop = async () => {
        try {
            setIsLoading(true);
            const data = await shopService.getMyShop();
            const shopData = data.shop || data;
            setShop(shopData);
            
            // Populate form fields (handle both camelCase and snake_case)
            setShopName(shopData.shopName || shopData.shop_name || "");
            setDescription(shopData.description || "");
            setPhone(shopData.phone || "");
            setEmail(shopData.email || "");
            setAddress(shopData.address || "");
            setCity(shopData.city || "");
            setDistrict(shopData.district || "");
            setWard(shopData.ward || "");
            setHours(shopData.operatingHours || shopData.operating_hours || {});
            setLogoUrl(shopData.logoUrl || shopData.logo_url || null);
            setBannerUrl(shopData.bannerUrl || shopData.banner_url || null);
        } catch (error) {
            console.log("No shop found or error loading shop");
            toast.error("Không thể tải thông tin shop");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview immediately
        const previewUrl = URL.createObjectURL(file);
        setLogoPreview(previewUrl);

        if (!shop?.id) {
            toast.error("Không tìm thấy shop");
            return;
        }

        setIsUploadingLogo(true);
        try {
            const result = await shopService.uploadLogo(shop.id, file);
            setLogoUrl(result.logoUrl || result.logo_url);
            setLogoPreview(null);
            toast.success("Logo đã được cập nhật!");
        } catch (error: any) {
            console.error("Upload error:", error);
            setLogoPreview(null);
            toast.error(error.response?.data?.error?.message || "Không thể tải lên logo");
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview immediately
        const previewUrl = URL.createObjectURL(file);
        setBannerPreview(previewUrl);

        if (!shop?.id) {
            toast.error("Không tìm thấy shop");
            return;
        }

        setIsUploadingBanner(true);
        try {
            const result = await shopService.uploadBanner(shop.id, file);
            setBannerUrl(result.bannerUrl || result.banner_url);
            setBannerPreview(null);
            toast.success("Banner đã được cập nhật!");
        } catch (error: any) {
            console.error("Upload error:", error);
            setBannerPreview(null);
            toast.error(error.response?.data?.error?.message || "Không thể tải lên banner");
        } finally {
            setIsUploadingBanner(false);
        }
    };

    const handleSave = async () => {
        if (!shop?.id) {
            toast.error("Không tìm thấy shop");
            return;
        }

        setIsSaving(true);
        try {
            const updateData: any = {
                shop_name: shopName,
                description: description || null,
                phone,
                email: email || null,
                address: address || null,
                city: city || null,
                district: district || null,
                ward: ward || null,
            };
            
            // Only include operating_hours if it has valid data
            if (hours && Object.keys(hours).length > 0) {
                updateData.operating_hours = hours;
            }

            await shopService.updateShop(shop.id, updateData);
            toast.success("Đã lưu thay đổi thành công!");
        } catch (error: any) {
            console.error("Save error:", error);
            const errorMsg = error.response?.data?.error?.message || 
                           error.response?.data?.error?.details || 
                           "Không thể lưu thay đổi";
            toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        loadShop(); // Reload original data
        toast.info("Đã hủy thay đổi");
    };

    const displayLogo = logoPreview || logoUrl;
    const displayBanner = bannerPreview || bannerUrl;

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
                            <input
                                type="file"
                                ref={logoInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleLogoSelect}
                            />
                            <div 
                                className="h-32 w-32 rounded-full bg-muted border-4 border-background shadow-lg mb-4 flex items-center justify-center text-muted-foreground overflow-hidden relative group cursor-pointer"
                                onClick={() => logoInputRef.current?.click()}
                            >
                                {displayLogo ? (
                                    <img src={displayLogo} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="z-10 group-hover:opacity-0 transition-opacity">Logo</span>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isUploadingLogo ? <Loader2 className="text-white h-6 w-6 animate-spin" /> : <Upload className="text-white h-6 w-6" />}
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => logoInputRef.current?.click()} disabled={isUploadingLogo}>
                                {isUploadingLogo ? "Đang tải..." : "Thay đổi Logo"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Banner Section */}
                    <Card className="shadow-premium border-border/50">
                        <CardHeader>
                            <CardTitle className="text-base">Banner Shop</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <input
                                type="file"
                                ref={bannerInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleBannerSelect}
                            />
                            <div 
                                className="h-24 w-full rounded-lg bg-muted border-2 border-dashed border-border mb-4 flex items-center justify-center text-muted-foreground overflow-hidden relative group cursor-pointer"
                                onClick={() => bannerInputRef.current?.click()}
                            >
                                {displayBanner ? (
                                    <img src={displayBanner} alt="Banner" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="z-10 group-hover:opacity-0 transition-opacity flex items-center gap-2">
                                        <ImagePlus className="h-4 w-4" /> Banner
                                    </span>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isUploadingBanner ? <Loader2 className="text-white h-6 w-6 animate-spin" /> : <Upload className="text-white h-6 w-6" />}
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => bannerInputRef.current?.click()} disabled={isUploadingBanner}>
                                {isUploadingBanner ? "Đang tải..." : "Thay đổi Banner"}
                            </Button>
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
                                <Input 
                                    id="shopName" 
                                    value={shopName}
                                    onChange={(e) => setShopName(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="desc">Mô tả giới thiệu</Label>
                                <Textarea 
                                    id="desc" 
                                    className="min-h-[100px]" 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Số điện thoại</Label>
                                    <Input 
                                        id="phone" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input 
                                        id="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
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
                                    <Input 
                                        id="street" 
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
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
                        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                            Hủy bỏ
                        </Button>
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
                </div>
            </div>
        </div>
    );
}
