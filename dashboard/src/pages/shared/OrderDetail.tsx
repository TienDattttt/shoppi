import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { orderService } from "@/services/order.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Printer, Package, Truck, CreditCard, MapPin, User, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Check context based on URL path
    const isAdmin = location.pathname.startsWith('/admin');
    const isPartner = location.pathname.startsWith('/partner');

    useEffect(() => {
        if (id) loadOrder(id);
    }, [id]);

    const loadOrder = async (orderId: string) => {
        setLoading(true);
        try {
            let response;
            
            // Use appropriate endpoint based on context
            if (isAdmin) {
                response = await orderService.getAdminOrderById(orderId);
            } else if (isPartner) {
                response = await orderService.getPartnerOrderById(orderId);
            } else {
                response = await orderService.getOrderById(orderId);
            }
            
            const data = response?.data || response;
            
            // Transform admin response to match expected format
            if (data && isAdmin) {
                // Flatten items from sub_orders
                const allItems = data.sub_orders?.flatMap((so: any) => 
                    (so.items || []).map((item: any) => ({
                        product_name: item.product_name,
                        product_thumb: item.product_image || '',
                        product_price: item.unit_price,
                        product_quantity: item.quantity
                    }))
                ) || [];
                
                data.order_products = allItems;
                data.order_status = data.status;
                data.order_checkout = { 
                    totalPrice: data.grand_total || data.subtotal,
                    shippingFee: data.shipping_total || 0
                };
                data.order_shipping = {
                    fullName: data.shipping_name || data.user?.full_name,
                    phone: data.shipping_phone || data.user?.phone,
                    address: data.shipping_address
                };
                data.createdAt = new Date(data.created_at).toLocaleDateString('vi-VN');
            }
            
            // Transform partner response to match expected format
            if (data && isPartner) {
                // Partner gets sub-order data, transform to expected format
                data.order_products = (data.items || []).map((item: any) => ({
                    product_name: item.productName,
                    product_thumb: item.imageUrl || '',
                    product_price: item.unitPrice,
                    product_quantity: item.quantity
                }));
                data.order_status = data.status;
                data.order_checkout = { 
                    totalPrice: data.total || data.subtotal,
                    shippingFee: data.shippingFee || 0
                };
                data.order_shipping = {
                    fullName: data.order?.shippingName,
                    phone: data.order?.shippingPhone,
                    address: data.order?.shippingAddress
                };
                data.userName = data.order?.shippingName;
                data.userPhone = data.order?.shippingPhone;
                data.payment_method = data.order?.paymentMethod;
                data.grand_total = data.total + (data.shippingFee || 0);
                data.createdAt = data.createdAt ? new Date(data.createdAt).toLocaleDateString('vi-VN') : '';
            }
            
            setOrder(data);
        } catch (error) {
            toast.error("Không thể tải thông tin đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
    };

    if (loading) return <div>Loading...</div>;
    if (!order) return <div>Order not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 pl-0 hover:pl-2 transition-all">
                    <ArrowLeft className="h-4 w-4" /> Back to Orders
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Printer className="h-4 w-4" /> Print Invoice
                    </Button>
                    <Button className="gap-2">
                        Update Status
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-6">
                    {/* Order Items */}
                    <div className="bg-card rounded-xl border p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" /> Order Items
                                <span className="text-sm font-normal text-muted-foreground">({order.order_products?.length || 0})</span>
                            </h2>
                            <Badge variant="outline">{order.order_status}</Badge>
                        </div>
                        <Separator className="mb-4" />
                        <div className="space-y-4">
                            {(order.order_products || []).map((item: any, idx: number) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="h-16 w-16 bg-muted rounded-md overflow-hidden border">
                                        <img src={item.product_thumb} alt={item.product_name} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium line-clamp-2">{item.product_name}</h3>
                                        <p className="text-sm text-muted-foreground">Qty: {item.product_quantity}</p>
                                    </div>
                                    <div className="font-semibold text-right">
                                        {formatCurrency(item.product_price * item.product_quantity)}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Separator className="my-4" />
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(order.order_checkout?.totalPrice || order.subtotal || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-2">
                            <span className="text-muted-foreground">Shipping Fee</span>
                            <span>{formatCurrency(order.order_checkout?.shippingFee || order.shipping_total || 30000)}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-lg mt-4 pt-4 border-t">
                            <span>Total</span>
                            <span className="text-primary">{formatCurrency(order.grand_total || (order.order_checkout?.totalPrice || 0) + 30000)}</span>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-card rounded-xl border p-6 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" /> Order Timeline
                        </h2>
                        <div className="space-y-4 pl-2 border-l-2 border-muted relative">
                            {order.timeline?.map((event: any, idx: number) => (
                                <div key={idx} className="pl-4 relative">
                                    <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-background border-2 border-primary" />
                                    <p className="text-sm font-medium capitalize">{event.status}</p>
                                    <p className="text-xs text-muted-foreground">{event.time}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-1/3 space-y-6">
                    {/* Customer Info */}
                    <div className="bg-card rounded-xl border p-6 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" /> Customer
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback>{(order.userName || order.user?.full_name || 'C')[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm">{order.userName || order.user?.full_name || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">{order.userPhone || order.user?.phone || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Info */}
                    <div className="bg-card rounded-xl border p-6 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" /> Shipping Address
                        </h2>
                        <div className="flex items-start gap-3 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p className="text-muted-foreground">
                                {order.order_shipping?.address || order.shipping_address || 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-card rounded-xl border p-6 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" /> Payment
                        </h2>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Method</span>
                            <span className="font-medium uppercase">{order.order_payment || order.payment_method || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
