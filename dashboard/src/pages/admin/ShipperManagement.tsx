import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, MapPin, Truck, Star } from "lucide-react";

const shippers = [
    { id: 1, name: "Nguyen Van Tai", phone: "0901234567", area: "Quan 1, HCM", rating: 4.9, status: "active", deliveries: 145 },
    { id: 2, name: "Le Van Xe", phone: "0909876543", area: "Quan 3, HCM", rating: 4.7, status: "busy", deliveries: 89 },
    { id: 3, name: "Tran Van Nhanh", phone: "0987654321", area: "Quan Binh Thanh, HCM", rating: 4.2, status: "offline", deliveries: 320 },
];

export default function ShipperManagement() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Quản lý Shipper</h1>
                <p className="text-muted-foreground mt-1">Danh sách và trạng thái tài xế vận chuyển</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shippers.map((shipper) => (
                    <Card key={shipper.id} className="shadow-premium border-border/50 overflow-hidden">
                        <CardHeader className="pb-3 bg-muted/20">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-background">
                                        <AvatarImage src={`https://avatar.vercel.sh/${shipper.name}`} />
                                        <AvatarFallback>SP</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-base">{shipper.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1">
                                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /> {shipper.rating}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant={shipper.status === 'active' ? 'default' : (shipper.status === 'busy' ? 'secondary' : 'outline')}>
                                    {shipper.status === 'active' ? 'Sẵn sàng' : (shipper.status === 'busy' ? 'Đang giao' : 'Nghỉ')}
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
                                <Truck className="mr-2 h-4 w-4" /> Đã giao: {shipper.deliveries} đơn
                            </div>
                            <div className="pt-2">
                                <Button variant="outline" className="w-full">Xem lộ trình</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
