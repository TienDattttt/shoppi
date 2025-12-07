import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Ticket, Edit, Ban, CheckCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { voucherService, type Voucher } from "@/services/voucher.service";
import { VoucherFormModal } from "@/components/modals/VoucherFormModal";
import { toast } from "sonner";

export default function PartnerVoucherManagement() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

    useEffect(() => {
        loadVouchers();
    }, []);

    const loadVouchers = async () => {
        setLoading(true);
        try {
            const data = await voucherService.getShopVouchers();
            setVouchers(data.data || []);
        } catch (error) {
            toast.error("Failed to load shop vouchers");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingVoucher(null);
        setIsModalOpen(true);
    };

    const handleEdit = (voucher: Voucher) => {
        setEditingVoucher(voucher);
        setIsModalOpen(true);
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await voucherService.toggleVoucherStatus(id, newStatus);
            toast.success(`Voucher ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
            loadVouchers();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleSubmit = async (data: Partial<Voucher>) => {
        try {
            if (editingVoucher) {
                await voucherService.updateVoucher(editingVoucher._id, data);
                toast.success("Voucher updated");
            } else {
                await voucherService.createVoucher(data);
                toast.success("Voucher created");
            }
            loadVouchers();
        } catch (error) {
            toast.error("Failed to save voucher");
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Shop Vouchers</h1>
                    <p className="text-muted-foreground mt-1">Manage your shop's discount codes</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Export Vouchers
                    </Button>
                    <Button className="shadow-lg" onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Create New Voucher
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vouchers.map((voucher) => (
                    <Card key={voucher._id} className="relative shadow-premium border-border/50 border-l-4 border-l-primary/50">
                        <div className="absolute top-0 right-0 p-2 z-10">
                            <Badge variant={voucher.status === 'active' ? 'outline' : 'secondary'}>
                                {voucher.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-xl">{voucher.code}</h3>
                                    <p className="text-sm font-medium">
                                        {voucher.discountType === 'fixed' ? formatCurrency(voucher.value) : `${voucher.value}%`} Off
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Ticket className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="my-4 h-px bg-border/50 border-dashed border-b" />
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Used: {voucher.usedCount}/{voucher.usageLimit}</span>
                                <span className="text-muted-foreground">{voucher.endDate || 'Forever'}</span>
                            </div>
                            <div className="pt-4 flex gap-2">
                                <Button variant="secondary" className="flex-1" onClick={() => handleEdit(voucher)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={voucher.status === 'active' ? 'text-destructive' : 'text-green-600'}
                                    onClick={() => handleToggleStatus(voucher._id, voucher.status)}
                                >
                                    {voucher.status === 'active' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <VoucherFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingVoucher}
            />
        </div>
    );
}
