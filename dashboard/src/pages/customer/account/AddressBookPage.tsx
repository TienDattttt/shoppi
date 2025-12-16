import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Trash2, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { addressService } from "@/services/address.service";
import type { Address } from "@/services/address.service";
import { AddressFormModal } from "@/components/common/AddressFormModal";
import { toast } from "sonner";

export default function AddressBookPage() {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

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

    const handleOpenAdd = () => {
        setEditingAddress(null);
        setShowDialog(true);
    };

    const handleOpenEdit = (address: Address) => {
        setEditingAddress(address);
        setShowDialog(true);
    };

    const handleAddressSuccess = async () => {
        await fetchAddresses();
        setEditingAddress(null);
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

            {/* Add/Edit Address Modal with Goong Autocomplete */}
            <AddressFormModal
                open={showDialog}
                onOpenChange={(open) => {
                    setShowDialog(open);
                    if (!open) setEditingAddress(null);
                }}
                onSuccess={handleAddressSuccess}
                editAddress={editingAddress}
                title="Thêm địa chỉ mới"
            />
        </div>
    );
}
