import { useState, useEffect } from "react";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Address {
    id: string;
    name: string;
    phone: string;
    address: string;
    isDefault: boolean;
}

interface AddressSectionProps {
    selectedAddressId?: string;
    onAddressChange?: (addressId: string) => void;
}

// Mock addresses - TODO: Fetch from API
const MOCK_ADDRESSES: Address[] = [
    {
        id: "addr-1",
        name: "Nguyễn Văn A",
        phone: "(+84) 912 345 678",
        address: "Số 1, Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
        isDefault: true,
    },
    {
        id: "addr-2",
        name: "Nguyễn Văn A",
        phone: "(+84) 987 654 321",
        address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
        isDefault: false,
    },
];

export function AddressSection({ selectedAddressId, onAddressChange }: AddressSectionProps) {
    const [addresses] = useState<Address[]>(MOCK_ADDRESSES);
    const [showDialog, setShowDialog] = useState(false);
    const [tempSelected, setTempSelected] = useState(selectedAddressId || "");

    // Set default address on mount
    useEffect(() => {
        if (!selectedAddressId && addresses.length > 0) {
            const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
            onAddressChange?.(defaultAddr.id);
        }
    }, [addresses, selectedAddressId, onAddressChange]);

    const selectedAddress = addresses.find(a => a.id === selectedAddressId) || 
                           addresses.find(a => a.isDefault) || 
                           addresses[0];

    const handleConfirm = () => {
        onAddressChange?.(tempSelected);
        setShowDialog(false);
    };

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
                            {selectedAddress.address}
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
                    <Button variant="outline" className="gap-2">
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
                                            <div className="text-sm text-gray-600 mt-1">{addr.address}</div>
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

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Hủy</Button>
                        <Button className="bg-shopee-orange hover:bg-shopee-orange-hover text-white" onClick={handleConfirm}>
                            Xác nhận
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
