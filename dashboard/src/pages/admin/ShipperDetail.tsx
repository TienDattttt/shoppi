import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { shipperService } from "@/services/shipper.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Truck, Phone, Mail, Map, Star, Award, TrendingUp, CreditCard, FileText, Check, X } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/common/StatCard";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function ShipperDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [shipper, setShipper] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (id) loadShipper(id);
    }, [id]);

    const loadShipper = async (shipperId: string) => {
        setLoading(true);
        try {
            const response = await shipperService.getShipperById(shipperId);
            const data = response?.data || response;

            const stats = data.statistics || {};
            const totalDeliveries = stats.totalDeliveries || data.totalDeliveries || data.total_deliveries || 0;
            const successfulDeliveries = stats.successfulDeliveries || data.successful_deliveries || 0;

            setShipper({
                ...data,
                name: data.name || data.user?.fullName || data.user?.full_name || 'Unknown',
                phone: data.phone || data.user?.phone || 'N/A',
                email: data.email || data.user?.email || 'N/A',
                avatar: data.avatar || data.user?.avatarUrl || data.user?.avatar_url,
                area: data.area || data.workingDistrict
                    ? `${data.workingDistrict || data.working_district}, ${data.workingCity || data.working_city}`
                    : (data.workingCity || data.working_city || 'N/A'),
                totalDeliveries: totalDeliveries,
                successRate: totalDeliveries > 0
                    ? Math.round((successfulDeliveries / totalDeliveries) * 100)
                    : 0,
                rating: stats.avgRating || data.rating || data.avg_rating || 0,
                // Additional fields for review
                idCardNumber: data.idCardNumber || data.id_card_number,
                vehicleType: data.vehicleType || data.vehicle_type,
                vehiclePlate: data.vehiclePlate || data.vehicle_plate,
                vehicleBrand: data.vehicleBrand || data.vehicle_brand,
                vehicleModel: data.vehicleModel || data.vehicle_model,
                // Document URLs
                idCardFrontUrl: data.idCardFrontUrl || data.id_card_front_url,
                idCardBackUrl: data.idCardBackUrl || data.id_card_back_url,
                driverLicenseUrl: data.driverLicenseUrl || data.driver_license_url,
            });
        } catch (error) {
            toast.error("Failed to load shipper");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!id) return;
        setProcessing(true);
        try {
            await shipperService.approveShipper(id);
            toast.success("Đã duyệt shipper thành công!");
            setShowApproveDialog(false);
            loadShipper(id);
        } catch (error) {
            toast.error("Có lỗi xảy ra khi duyệt shipper");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!id || !rejectReason.trim()) {
            toast.error("Vui lòng nhập lý do từ chối");
            return;
        }
        setProcessing(true);
        try {
            await shipperService.rejectShipper(id, rejectReason);
            toast.success("Đã từ chối shipper");
            setShowRejectDialog(false);
            navigate("/admin/shippers");
        } catch (error) {
            toast.error("Có lỗi xảy ra khi từ chối shipper");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!shipper) return <div>Shipper not found</div>;

    const isPending = shipper.status === 'pending';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => navigate("/admin/shippers")} className="gap-2 pl-0 hover:pl-2 transition-all">
                    <ArrowLeft className="h-4 w-4" /> Quay lại
                </Button>

                {isPending && (
                    <div className="flex gap-2">
                        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowRejectDialog(true)}>
                            <X className="h-4 w-4 mr-2" /> Từ chối
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowApproveDialog(true)}>
                            <Check className="h-4 w-4 mr-2" /> Duyệt
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Profile */}
                <div className="w-full md:w-1/3 space-y-6">
                    <div className="bg-card rounded-xl border p-6 flex flex-col items-center text-center shadow-sm">
                        <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src={shipper.avatar} />
                            <AvatarFallback>{(shipper.name || 'UN').substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-bold">{shipper.name || 'Unknown'}</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            <Badge variant={shipper.status === 'active' ? 'default' : (shipper.status === 'pending' ? 'secondary' : 'destructive')} className="capitalize">
                                {shipper.status === 'pending' ? 'Chờ duyệt' : shipper.status}
                            </Badge>
                            <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {shipper.rating}</span>
                        </div>

                        <div className="w-full mt-6 space-y-3 text-left">
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" /> {shipper.phone || 'N/A'}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" /> {shipper.email || 'N/A'}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Map className="h-4 w-4 text-muted-foreground" /> {shipper.area || 'N/A'}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <CreditCard className="h-4 w-4 text-muted-foreground" /> CCCD: {shipper.idCardNumber || 'N/A'}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Truck className="h-4 w-4 text-muted-foreground" /> {shipper.vehicleType || 'N/A'} - {shipper.vehiclePlate || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats & Content */}
                <div className="flex-1 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <StatCard title="Tổng đơn giao" value={shipper.totalDeliveries || 0} icon={Truck} />
                        <StatCard title="Tỷ lệ hoàn thành" value={`${shipper.successRate || 0}%`} icon={Award} />
                        <StatCard title="Đánh giá" value={shipper.rating || 0} icon={TrendingUp} />
                    </div>

                    <Tabs defaultValue="documents" className="w-full">
                        <TabsList>
                            <TabsTrigger value="documents">Hồ sơ đăng ký</TabsTrigger>
                            <TabsTrigger value="history">Lịch sử giao hàng</TabsTrigger>
                            <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
                        </TabsList>

                        <TabsContent value="documents" className="pt-6">
                            <div className="bg-card rounded-xl border p-6 shadow-sm space-y-6">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <FileText className="h-5 w-5" /> Giấy tờ tùy thân
                                </h3>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">CCCD mặt trước</p>
                                        {shipper.idCardFrontUrl ? (
                                            <img src={shipper.idCardFrontUrl} alt="CCCD mặt trước" className="w-full h-40 object-cover rounded-lg border" />
                                        ) : (
                                            <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">Chưa có ảnh</div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">CCCD mặt sau</p>
                                        {shipper.idCardBackUrl ? (
                                            <img src={shipper.idCardBackUrl} alt="CCCD mặt sau" className="w-full h-40 object-cover rounded-lg border" />
                                        ) : (
                                            <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">Chưa có ảnh</div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Bằng lái xe</p>
                                        {shipper.driverLicenseUrl ? (
                                            <img src={shipper.driverLicenseUrl} alt="Bằng lái xe" className="w-full h-40 object-cover rounded-lg border" />
                                        ) : (
                                            <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">Chưa có ảnh</div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Loại xe</p>
                                        <p className="font-medium capitalize">{shipper.vehicleType || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Biển số xe</p>
                                        <p className="font-medium">{shipper.vehiclePlate || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Hãng xe</p>
                                        <p className="font-medium">{shipper.vehicleBrand || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Model xe</p>
                                        <p className="font-medium">{shipper.vehicleModel || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="pt-6">
                            <div className="bg-card rounded-xl border p-0 overflow-hidden">
                                {shipper.history?.length > 0 ? (
                                    <div className="divide-y">
                                        {shipper.history.map((item: any, idx: number) => (
                                            <div key={idx} className="p-4 flex justify-between items-center hover:bg-muted/50">
                                                <div>
                                                    <p className="font-medium text-sm">Đơn #{item.orderId}</p>
                                                    <p className="text-xs text-muted-foreground">{item.date}</p>
                                                </div>
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 capitalize">{item.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">Chưa có lịch sử giao hàng</div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="reviews" className="pt-6">
                            <div className="bg-card rounded-xl border p-6 shadow-sm flex items-center justify-center text-muted-foreground">
                                Chưa có đánh giá.
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận duyệt shipper</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn duyệt shipper <strong>{shipper.name}</strong>?
                            Sau khi duyệt, shipper có thể đăng nhập và bắt đầu nhận đơn giao hàng.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={processing}>
                            Hủy
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={processing}>
                            {processing ? "Đang xử lý..." : "Xác nhận duyệt"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Từ chối shipper</DialogTitle>
                        <DialogDescription>
                            Vui lòng nhập lý do từ chối đăng ký của shipper <strong>{shipper.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Nhập lý do từ chối..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="min-h-[100px]"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={processing}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectReason.trim()}>
                            {processing ? "Đang xử lý..." : "Từ chối"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

