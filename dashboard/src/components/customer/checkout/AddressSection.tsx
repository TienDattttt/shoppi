import { useState, useEffect } from "react";
import { MapPin, Plus, Loader2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { addressService } from "@/services/address.service";
import type { Address } from "@/services/address.service";
import { AddressFormModal } from "@/components/common/AddressFormModal";

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
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);

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

    const handleAddressSuccess = async (address: Address) => {
        await fetchAddresses();
        onAddressChange?.(address.id);
        setEditingAddress(null);
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
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-500 hover:text-blue-600"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingAddress(addr);
                                            setShowDialog(false);
                                            setShowAddDialog(true);
                                        }}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
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

            {/* Add/Edit Address Modal with Goong Autocomplete */}
            <AddressFormModal
                open={showAddDialog}
                onOpenChange={(open) => {
                    setShowAddDialog(open);
                    if (!open) setEditingAddress(null);
                }}
                onSuccess={handleAddressSuccess}
                editAddress={editingAddress}
                title="Thêm địa chỉ mới"
            />
        </div>
    );
}
