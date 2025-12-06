import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { shipperService } from "@/services/shipper.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Truck, Phone, Mail, Map, Star, Award, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/common/StatCard";

export default function ShipperDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [shipper, setShipper] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadShipper(id);
    }, [id]);

    const loadShipper = async (shipperId: string) => {
        setLoading(true);
        try {
            const data = await shipperService.getShipperById(shipperId);
            setShipper(data);
        } catch (error) {
            toast.error("Failed to load shipper");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!shipper) return <div>Shipper not found</div>;

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate("/admin/shippers")} className="gap-2 pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="h-4 w-4" /> Back to Shippers
            </Button>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Profile */}
                <div className="w-full md:w-1/3 space-y-6">
                    <div className="bg-card rounded-xl border p-6 flex flex-col items-center text-center shadow-sm">
                        <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src={shipper.avatar} />
                            <AvatarFallback>{shipper.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-bold">{shipper.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            <Badge variant={shipper.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                {shipper.status}
                            </Badge>
                            <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {shipper.rating}</span>
                        </div>

                        <div className="w-full mt-6 space-y-3 text-left">
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" /> {shipper.phone}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" /> {shipper.email}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Map className="h-4 w-4 text-muted-foreground" /> {shipper.area}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats & Content */}
                <div className="flex-1 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <StatCard title="Total Deliveries" value={shipper.totalDeliveries} icon={Truck} />
                        <StatCard title="Success Rate" value={`${shipper.successRate}%`} icon={Award} />
                        <StatCard title="Performance" value="High" icon={TrendingUp} />
                    </div>

                    <Tabs defaultValue="history" className="w-full">
                        <TabsList>
                            <TabsTrigger value="history">Delivery History</TabsTrigger>
                            <TabsTrigger value="reviews">Reviews</TabsTrigger>
                        </TabsList>
                        <TabsContent value="history" className="pt-6">
                            <div className="bg-card rounded-xl border p-0 overflow-hidden">
                                {shipper.history?.length > 0 ? (
                                    <div className="divide-y">
                                        {shipper.history.map((item: any, idx: number) => (
                                            <div key={idx} className="p-4 flex justify-between items-center hover:bg-muted/50">
                                                <div>
                                                    <p className="font-medium text-sm">Order #{item.orderId}</p>
                                                    <p className="text-xs text-muted-foreground">{item.date}</p>
                                                </div>
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 capitalize">{item.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">No history available</div>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="reviews" className="pt-6">
                            <div className="bg-card rounded-xl border p-6 shadow-sm flex items-center justify-center text-muted-foreground">
                                No reviews yet.
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
