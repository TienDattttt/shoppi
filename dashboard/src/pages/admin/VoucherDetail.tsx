import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { voucherService, type Voucher } from "@/services/voucher.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Ticket, Calendar, Tag, Users, Ban, CheckCircle, Edit } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";

export default function VoucherDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [voucher, setVoucher] = useState<Voucher | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadVoucher(id);
    }, [id]);

    const loadVoucher = async (voucherId: string) => {
        setLoading(true);
        try {
            const data = await voucherService.getVoucherById(voucherId);
            setVoucher(data);
        } catch (error) {
            toast.error("Failed to load voucher");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!voucher || !id) return;
        const newStatus = voucher.status === 'active' ? 'inactive' : 'active';
        try {
            await voucherService.toggleVoucherStatus(id, newStatus);
            toast.success(`Voucher ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
            loadVoucher(id);
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!voucher) return <div className="p-8 text-center">Voucher not found</div>;

    const usagePercent = voucher.usageLimit > 0 ? Math.round((voucher.usedCount / voucher.usageLimit) * 100) : 0;

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate("/admin/vouchers")} className="gap-2 pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="h-4 w-4" /> Back to Vouchers
            </Button>

            {/* Header Card */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="h-24 w-24 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Ticket className="h-12 w-12 text-orange-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant={voucher.status === 'active' ? 'default' : 'secondary'}>
                                        {voucher.status === 'active' ? 'Active' : 'Inactive'}
                                    </Badge>
                                    <Badge variant="outline">{voucher.discountType === 'fixed' ? 'Fixed' : 'Percentage'}</Badge>
                                </div>
                                <h1 className="text-3xl font-bold tracking-wider">{voucher.code}</h1>
                                <p className="text-lg text-muted-foreground mt-1">
                                    {voucher.discountType === 'fixed' ? formatCurrency(voucher.value) : `${voucher.value}%`} Off
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => toast.info("Edit modal coming soon")}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </Button>
                                <Button
                                    variant={voucher.status === 'active' ? 'destructive' : 'default'}
                                    onClick={handleToggleStatus}
                                >
                                    {voucher.status === 'active' ? (
                                        <><Ban className="mr-2 h-4 w-4" /> Deactivate</>
                                    ) : (
                                        <><CheckCircle className="mr-2 h-4 w-4" /> Activate</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <StatCard title="Total Used" value={voucher.usedCount} icon={Tag} />
                <StatCard title="Usage Limit" value={voucher.usageLimit} icon={Users} />
                <StatCard title="Usage Rate" value={`${usagePercent}%`} icon={Ticket} />
                <StatCard title="Min Order" value={formatCurrency(voucher.minOrderValue)} icon={Calendar} />
            </div>

            {/* Details */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Voucher Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Code</span>
                            <span className="font-mono font-bold">{voucher.code}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Discount Type</span>
                            <span className="capitalize">{voucher.discountType}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Discount Value</span>
                            <span>{voucher.discountType === 'fixed' ? formatCurrency(voucher.value) : `${voucher.value}%`}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Min Order Value</span>
                            <span>{formatCurrency(voucher.minOrderValue)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Start Date</span>
                            <span>{voucher.startDate}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-muted-foreground">End Date</span>
                            <span>{voucher.endDate || 'No expiry'}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Usage Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span>Used: {voucher.usedCount}</span>
                                <span>Limit: {voucher.usageLimit}</span>
                            </div>
                            <div className="h-4 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground text-center">
                                {voucher.usageLimit - voucher.usedCount} uses remaining
                            </p>
                        </div>

                        <div className="mt-8">
                            <h4 className="font-semibold mb-4">Recent Usage</h4>
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No usage history available
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
