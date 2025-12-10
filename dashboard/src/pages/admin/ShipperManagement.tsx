import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, MapPin, Truck, Star, Plus, Eye, Users } from "lucide-react";
import { shipperService, type Shipper } from "@/services/shipper.service";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function ShipperManagement() {
    const navigate = useNavigate();
    const [shippers, setShippers] = useState<Shipper[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);

    useEffect(() => {
        loadShippers();
    }, []);

    const loadShippers = async () => {
        setLoading(true);
        try {
            const data = await shipperService.getAllShippers();
            // API interceptor already unwraps response.data.data to response.data
            setShippers(Array.isArray(data) ? data : (data.data || []));
        } catch (error) {
            toast.error("Failed to load shippers");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await shipperService.updateShipperStatus(id, newStatus);
            toast.success("Status updated");
            loadShippers();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Quản lý Shipper</h1>
                    <p className="text-muted-foreground mt-1">Danh sách và trạng thái tài xế vận chuyển</p>
                </div>
                <Button className="shadow-lg" onClick={() => setShowAddDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm Shipper
                </Button>
            </div>

            {shippers.length === 0 ? (
                <Card className="p-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Chưa có shipper nào</h3>
                    <p className="text-muted-foreground mb-4">Thêm shipper mới để bắt đầu quản lý đội ngũ vận chuyển</p>
                    <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Thêm Shipper
                    </Button>
                </Card>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shippers.map((shipper) => (
                    <Card key={shipper._id} className="shadow-premium border-border/50 overflow-hidden">
                        <CardHeader className="pb-3 bg-muted/20">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-background">
                                        <AvatarImage src={shipper.avatar || `https://avatar.vercel.sh/${shipper.name}`} />
                                        <AvatarFallback>{shipper.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-base">{shipper.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1">
                                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /> {shipper.rating}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant={shipper.status === 'active' ? 'default' : (shipper.status === 'inactive' ? 'secondary' : 'destructive')}>
                                    {shipper.status === 'active' ? 'Hoạt động' : (shipper.status === 'inactive' ? 'Nghỉ' : 'Bị khóa')}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Phone className="mr-2 h-4 w-4" /> {shipper.phone}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="mr-2 h-4 w-4" /> {shipper.area}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Truck className="mr-2 h-4 w-4" /> Đã giao: {shipper.totalDeliveries} đơn ({shipper.successRate}% thành công)
                            </div>
                            <div className="pt-2 flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => navigate(`/admin/shippers/${shipper._id}`)}>
                                    <Eye className="mr-2 h-4 w-4" /> Chi tiết
                                </Button>
                                {shipper.status === 'active' ? (
                                    <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleStatusChange(shipper._id, 'inactive')}>
                                        <Truck className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="icon" className="text-green-600" onClick={() => handleStatusChange(shipper._id, 'active')}>
                                        <Truck className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            )}

            {/* Add Shipper Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thêm Shipper mới</DialogTitle>
                        <DialogDescription>
                            Shipper được tạo khi người dùng đăng ký với vai trò shipper. 
                            Bạn có thể duyệt và kích hoạt tài khoản shipper từ danh sách chờ duyệt.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Để thêm shipper mới, hướng dẫn họ đăng ký tài khoản tại trang đăng ký 
                            và chọn vai trò "Shipper". Sau đó bạn có thể duyệt tài khoản của họ tại đây.
                        </p>
                    </div>
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Đóng
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
