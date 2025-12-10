import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Tag, Ticket, Calendar, Edit, Ban, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { voucherService, type Voucher } from "@/services/voucher.service";
import { VoucherFormModal } from "@/components/modals/VoucherFormModal";
import { toast } from "sonner";

export default function VoucherManagement() {
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
            const response = await voucherService.getAllVouchers();
            const data = response?.data || response || [];
            setVouchers(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error("Failed to load vouchers");
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
                const voucherId = (editingVoucher as any)._id || (editingVoucher as any).id;
                await voucherService.updateVoucher(voucherId, data);
                toast.success("Voucher updated");
            } else {
                await voucherService.createSystemVoucher(data as any);
                toast.success("Voucher created");
            }
            setIsModalOpen(false);
            loadVouchers();
        } catch (error) {
            toast.error(editingVoucher ? "Failed to update" : "Failed to create");
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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Vouchers</h1>
                    <p className="text-muted-foreground mt-1">Manage system-wide discount codes</p>
                </div>
                <Button className="shadow-lg" onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> Create Voucher</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vouchers.map((voucher) => (
                    <Card key={voucher._id} className="relative shadow-premium border-border/50 overflow-hidden group hover:border-primary/50 transition-all">
                        <div className="absolute top-0 right-0 p-2 z-10">
                            <Badge variant={voucher.status === 'active' ? 'default' : 'secondary'}>
                                {voucher.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                                    <Ticket className="h-6 w-6" />
                                </div>
                                <div className="space-y-2 flex-1">
                                    <div>
                                        <h3 className="font-bold text-lg tracking-wide">{voucher.code}</h3>
                                        <p className="text-sm text-foreground/80">
                                            {voucher.discountType === 'fixed' ? formatCurrency(voucher.value) : `${voucher.value}%`} Off
                                        </p>
                                        <p className="text-xs text-muted-foreground">Min Order: {formatCurrency(voucher.minOrderValue)}</p>
                                    </div>
                                    <div className="space-y-1 pt-2">
                                        <div className="flex items-center text-xs text-muted-foreground">
                                            <Tag className="mr-1.5 h-3 w-3" />
                                            Used: {voucher.usedCount}/{voucher.usageLimit}
                                        </div>
                                        <div className="flex items-center text-xs text-muted-foreground">
                                            <Calendar className="mr-1.5 h-3 w-3" />
                                            Valid: {voucher.startDate} - {voucher.endDate || 'Forever'}
                                        </div>
                                    </div>
                                    <div className="pt-4 flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(voucher)}>
                                            <Edit className="mr-1 h-3 w-3" /> Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`flex-1 ${voucher.status === 'active' ? 'text-destructive border-destructive hover:bg-destructive/10' : 'text-green-600 border-green-600 hover:bg-green-50'}`}
                                            onClick={() => handleToggleStatus(voucher._id, voucher.status)}
                                        >
                                            {voucher.status === 'active' ? <><Ban className="mr-1 h-3 w-3" /> Deactivate</> : <><CheckCircle className="mr-1 h-3 w-3" /> Activate</>}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        {/* Decorative Circles */}
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted/40" />
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted/40" />
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
