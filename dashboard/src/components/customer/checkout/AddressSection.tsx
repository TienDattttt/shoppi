import { useState, useEffect } from "react";
import { MapPin, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { addressService, type Address, type CreateAddressData } from "@/services/address.service";
import { toast } from "sonner";

interface AddressSectionProps {
    selectedAddressId?: string;
    onAddressChange?: (addressId: string) => void;
}

export function AddressSection({ selectedAddressId, onAddressChange }: AddressSectionProps) {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [tempSelected, setTempSelected] = useState(selectedAddressId || "");
    const [saving, setSaving] = useState(false);
    
    // New address form
    const [newAddress, setNewAddress] = useState<CreateAddressData>({
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
            
            // Auto-select default or first address
            if (data.length > 0 && !selectedAddressId) {
                const defaultAddr = data.find(a => a.isDefault) || data[0];
                onAddressChange?.(defaultAddr.id);
            }
        } catch (error) {
            console.error("Error fetching addresses:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddresses();
    }, []);

    const selectedAddress = addresses.find(a => a.id === selectedAddressId) || 
                           addresses.find(a => a.isDefault) || 
                           addresses[0];

    const handleConfirm = () => {
        onAddressChange?.(tempSelected);
        setShowDialog(false);
    };

    const handleAddAddress = async () => {
        if (!newAddress.name || !newAddress.phone || !newAddress.addressLine) {
            toast.error("Vui lòng điền đầy đủ thông tin");
            return;
        }

        try {
            setSaving(true);
            const fullAddress = [
                newAddress.addressLine,
                newAddress.ward,
                newAddress.district,
                newAddress.province
            ].filter(Boolean).join(", ");

            const created = await addressService.createAddress({
                ...newAddress,
                fullAddress,
            });
            
            toast.success("Thêm địa chỉ thành công");
            setShowAddDialog(false);
            setNewAddress({
                name: "",
                phone: "",
                addressLine: "",
                province: "",
                district: "",
                ward: "",
                isDefault: false,
            });
            
            // Refresh and select new address
            await fetchAddresses();
            onAddressChange?.(created.id);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể thêm địa chỉ");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-sm shadow-sm flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-shopee-orange" />
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-sm shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-shopee-orange font-medium text-lg">
                    <MapPin className="h-5 w-5" />
                    Địa chỉ nhận hàng
                </div>
            </div>

            {selectedAddress ? (
                <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                            <span className="font-bold">{selectedAddress.name} {selectedAddress.phone}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                            {selectedAddress.fullAddress || selectedAddress.addressLine}
                        </div>
                        {selectedAddress.isDefault && (
                            <div className="text-xs text-shopee-orange border border-shopee-orange px-1 py-0.5 w-fit mt-2 rounded-sm">
                                Mặc định
                            </div>
                        )}
                    </div>
                    <Button variant="link" className="text-blue-500 p-0 h-auto" onClick={() => {
                        setTempSelected(selectedAddressId || selectedAddress.id);
                        setShowDialog(true);
                    }}>
                        Thay đổi
                    </Button>
                </div>
            ) : (
                <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Chưa có địa chỉ giao hàng</p>
                    <Button variant="outline" className="gap-2" onClick={() => setShowAddDialog(true)}>
                        <Plus className="h-4 w-4" /> Thêm địa chỉ mới
                    </Button>
                </div>
            )}

            {/* Address Selection Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Chọn địa chỉ giao hàng</DialogTitle>
                    </DialogHeader>
                    
                    <RadioGroup value={tempSelected} onValueChange={setTempSelected} className="space-y-3">
                        {addresses.map(addr => (
                            <div 
                                key={addr.id}
                                className={`border rounded-sm p-4 cursor-pointer ${tempSelected === addr.id ? 'border-shopee-orange bg-orange-50' : ''}`}
                                onClick={() => setTempSelected(addr.id)}
                            >
                                <div className="flex items-start gap-3">
                                    <RadioGroupItem value={addr.id} id={addr.id} className="mt-1" />
                                    <div className="flex-1">
                                        <Label htmlFor={addr.id} className="cursor-pointer">
                                            <div className="font-medium">{addr.name} | {addr.phone}</div>
                                            <div className="text-sm text-gray-600 mt-1">{addr.fullAddress || addr.addressLine}</div>
                                            {addr.isDefault && (
                                                <span className="text-xs text-shopee-orange border border-shopee-orange px-1 py-0.5 rounded-sm mt-2 inline-block">
                                                    Mặc định
                                                </span>
                                            )}
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </RadioGroup>

                    <Button 
                        variant="outline" 
                        className="w-full gap-2 mt-2"
                        onClick={() => {
                            setShowDialog(false);
                            setShowAddDialog(true);
                        }}
                    >
                        <Plus className="h-4 w-4" /> Thêm địa chỉ mới
                    </Button>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Hủy</Button>
                        <Button className="bg-shopee-orange hover:bg-shopee-orange-hover text-white" onClick={handleConfirm}>
                            Xác nhận
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Address Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Thêm địa chỉ mới</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Họ tên</Label>
                                <Input
                                    placeholder="Nguyễn Văn A"
                                    value={newAddress.name}
                                    onChange={(e) => setNewAddress(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Số điện thoại</Label>
                                <Input
                                    placeholder="0912345678"
                                    value={newAddress.phone}
                                    onChange={(e) => setNewAddress(prev => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Tỉnh/Thành phố</Label>
                                <Input
                                    placeholder="Hà Nội"
                                    value={newAddress.province}
                                    onChange={(e) => setNewAddress(prev => ({ ...prev, province: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Quận/Huyện</Label>
                                <Input
                                    placeholder="Hai Bà Trưng"
                                    value={newAddress.district}
                                    onChange={(e) => setNewAddress(prev => ({ ...prev, district: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Phường/Xã</Label>
                                <Input
                                    placeholder="Bách Khoa"
                                    value={newAddress.ward}
                                    onChange={(e) => setNewAddress(prev => ({ ...prev, ward: e.target.value }))}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <Label>Địa chỉ cụ thể</Label>
                            <Input
                                placeholder="Số 1, Đại Cồ Việt"
                                value={newAddress.addressLine}
                                onChange={(e) => setNewAddress(prev => ({ ...prev, addressLine: e.target.value }))}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                checked={newAddress.isDefault}
                                onChange={(e) => setNewAddress(prev => ({ ...prev, isDefault: e.target.checked }))}
                            />
                            <Label htmlFor="isDefault" className="cursor-pointer">Đặt làm địa chỉ mặc định</Label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>Hủy</Button>
                        <Button 
                            className="bg-shopee-orange hover:bg-shopee-orange-hover text-white" 
                            onClick={handleAddAddress}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Thêm địa chỉ
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
