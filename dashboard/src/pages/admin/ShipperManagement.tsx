import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, MapPin, Truck, Star, Plus, Eye } from "lucide-react";
import { shipperService, type Shipper } from "@/services/shipper.service";
import { toast } from "sonner";

export default function ShipperManagement() {
    const navigate = useNavigate();
    const [shippers, setShippers] = useState<Shipper[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadShippers();
    }, []);

    const loadShippers = async () => {
        setLoading(true);
        try {
            const data = await shipperService.getAllShippers();
            setShippers(data.data || []);
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
                <Button className="shadow-lg">
                    <Plus className="mr-2 h-4 w-4" /> Thêm Shipper
                </Button>
            </div>

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
        </div>
    );
}
