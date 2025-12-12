import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Trash2, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { addressService, type Address, type CreateAddressData } from "@/services/address.service";
import { toast } from "sonner";

export default function AddressBookPage() {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    
    const [formData, setFormData] = useState<CreateAddressData>({
        name: "",
        phone: "",
        addressLine: "",
        province: "",
        district: "",
        ward: "",
        isDefault: false,
    });

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const data = await addressService.getAddresses();
            setAddresses(data);
        } catch (error) {
            console.error("Error fetching addresses:", error);
            toast.error("Không thể tải danh sách địa chỉ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddresses();
    }, []);

    const resetForm = () => {
        setFormData({
            name: "",
            phone: "",
            addressLine: "",
            province: "",
            district: "",
            ward: "",
            isDefault: false,
        });
        setEditingAddress(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setShowDialog(true);
    };

    const handleOpenEdit = (address: Address) => {
        setEditingAddress(address);
        setFormData({
            name: address.name,
            phone: address.phone,
            addressLine: address.addressLine,
            province: address.province || "",
            district: address.district || "",
            ward: address.ward || "",
            isDefault: address.isDefault,
        });
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.phone || !formData.addressLine) {
            toast.error("Vui lòng điền đầy đủ thông tin");
            return;
        }

        try {
            setSaving(true);
            const fullAddress = [
                formData.addressLine,
                formData.ward,
                formData.district,
                formData.province
            ].filter(Boolean).join(", ");

            if (editingAddress) {
                await addressService.updateAddress(editingAddress.id, {
                    ...formData,
                    fullAddress,
                });
                toast.success("Cập nhật địa chỉ thành công");
            } else {
                await addressService.createAddress({
                    ...formData,
                    fullAddress,
                });
                toast.success("Thêm địa chỉ thành công");
            }
            
            setShowDialog(false);
            resetForm();
            fetchAddresses();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể lưu địa chỉ");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa địa chỉ này?")) return;

        try {
            setDeleting(id);
            await addressService.deleteAddress(id);
            toast.success("Xóa địa chỉ thành công");
            fetchAddresses();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể xóa địa chỉ");
        } finally {
            setDeleting(null);
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await addressService.setDefaultAddress(id);
            toast.success("Đã đặt làm địa chỉ mặc định");
            fetchAddresses();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể đặt làm mặc định");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
                <h1 className="text-xl font-medium">Địa chỉ của tôi</h1>
                <Button className="bg-shopee-orange hover:bg-shopee-orange-hover text-white" onClick={handleOpenAdd}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm địa chỉ mới
                </Button>
            </div>

            {addresses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>Chưa có địa chỉ nào</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {addresses.map((addr) => (
                        <div key={addr.id} className="border-b pb-4 last:border-0 flex justify-between items-start">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-base border-r pr-2 border-gray-300">{addr.name}</span>
                                    <span className="text-gray-500 text-sm">{addr.phone}</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                    {addr.fullAddress || addr.addressLine}
                                </div>
                                <div className="flex gap-2 mt-2">
                                    {addr.isDefault && (
                                        <Badge variant="outline" className="text-shopee-orange border-shopee-orange font-normal">Mặc định</Badge>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 text-sm">
                                <div className="flex gap-2">
                                    <button 
                                        className="text-blue-500 hover:underline flex items-center gap-1"
                                        onClick={() => handleOpenEdit(addr)}
                                    >
                                        <Edit2 className="h-3 w-3" /> Sửa
                                    </button>
                                    {!addr.isDefault && (
                                        <>
                                            <span className="text-gray-300">|</span>
                                            <button 
                                                className="text-red-500 hover:underline flex items-center gap-1"
                                                onClick={() => handleDelete(addr.id)}
                                                disabled={deleting === addr.id}
                                            >
                                                {deleting === addr.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3 w-3" />
                                                )}
                                                Xóa
                                            </button>
                                        </>
                                    )}
                                </div>
                                {!addr.isDefault && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 text-xs mt-2"
                                        onClick={() => handleSetDefault(addr.id)}
                                    >
                                        Đặt làm mặc định
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingAddress ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Họ tên</Label>
                                <Input
                                    placeholder="Nguyễn Văn A"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Số điện thoại</Label>
                                <Input
                                    placeholder="0912345678"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Tỉnh/Thành phố</Label>
                                <Input
                                    placeholder="Hà Nội"
                                    value={formData.province}
                                    onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Quận/Huyện</Label>
                                <Input
                                    placeholder="Hai Bà Trưng"
                                    value={formData.district}
                                    onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Phường/Xã</Label>
                                <Input
                                    placeholder="Bách Khoa"
                                    value={formData.ward}
                                    onChange={(e) => setFormData(prev => ({ ...prev, ward: e.target.value }))}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <Label>Địa chỉ cụ thể</Label>
                            <Input
                                placeholder="Số 1, Đại Cồ Việt"
                                value={formData.addressLine}
                                onChange={(e) => setFormData(prev => ({ ...prev, addressLine: e.target.value }))}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                checked={formData.isDefault}
                                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                            />
                            <Label htmlFor="isDefault" className="cursor-pointer">Đặt làm địa chỉ mặc định</Label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Hủy</Button>
                        <Button 
                            className="bg-shopee-orange hover:bg-shopee-orange-hover text-white" 
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {editingAddress ? "Cập nhật" : "Thêm địa chỉ"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
