import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Truck, CreditCard, Loader2, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { orderService, type Order } from "@/services/order.service";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ReviewModal } from "@/components/customer/review/ReviewModal";

// Map status to Vietnamese
function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
        'pending_payment': 'Chờ thanh toán',
        'payment_failed': 'Thanh toán thất bại',
        'confirmed': 'Đã xác nhận',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy',
        'refunded': 'Đã hoàn tiền',
        'pending': 'Chờ xác nhận',
        'processing': 'Đang xử lý',
        'ready_to_ship': 'Chờ lấy hàng',
        'shipping': 'Đang giao',
        'delivered': 'Đã giao',
        'return_requested': 'Yêu cầu trả hàng',
        'return_approved': 'Đã duyệt trả hàng',
        'returned': 'Đã trả hàng',
    };
    return statusMap[status] || status;
}

function getPaymentMethodText(method: string): string {
    const methodMap: Record<string, string> = {
        'cod': 'Thanh toán khi nhận hàng (COD)',
        'momo': 'Ví MoMo',
        'vnpay': 'VNPay',
        'zalopay': 'ZaloPay',
    };
    return methodMap[method] || method;
}

export default function OrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [showReviewModal, setShowReviewModal] = useState(false);

    useEffect(() => {
        if (id) {
            fetchOrder();
        }
    }, [id]);

    const fetchOrder = async () => {
        setLoading(true);
        try {
            const data = await orderService.getOrderById(id!);
            setOrder(data);
        } catch (error) {
            console.error("Failed to fetch order:", error);
            toast.error("Không thể tải thông tin đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!cancelReason.trim()) {
            toast.error("Vui lòng nhập lý do hủy đơn");
            return;
        }

        setActionLoading(true);
        try {
            await orderService.cancelOrder(id!, cancelReason);
            toast.success("Đã hủy đơn hàng");
            setShowCancelDialog(false);
            fetchOrder();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể hủy đơn hàng");
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmReceipt = async () => {
        setActionLoading(true);
        try {
            await orderService.confirmReceipt(id!);
            toast.success("Đã xác nhận nhận hàng");
            fetchOrder();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể xác nhận");
        } finally {
            setActionLoading(false);
        }
    };

    const handlePayNow = async () => {
        if (!order) return;
        
        setActionLoading(true);
        try {
            const session = await orderService.createPaymentSession(
                order.id,
                order.paymentMethod || 'momo',
                window.location.href
            );
            
            if (session.payUrl) {
                window.location.href = session.payUrl;
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể tạo phiên thanh toán");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-medium mb-4">Không tìm thấy đơn hàng</h2>
                <Button onClick={() => navigate("/user/purchase")}>Quay lại</Button>
            </div>
        );
    }

    // Get all items from sub-orders
    const allItems = order.subOrders?.flatMap(so => so.items) || [];
    
    // Check if order can be cancelled
    const canCancel = ['pending_payment', 'confirmed'].includes(order.status) &&
        !order.subOrders?.some(so => so.status === 'shipping');
    
    // Check if can confirm receipt
    const canConfirmReceipt = order.subOrders?.some(so => so.status === 'delivered');
    
    // Check if needs payment
    const needsPayment = order.status === 'pending_payment' && order.paymentMethod !== 'cod';
    
    // Check if can review (order completed)
    const canReview = order.status === 'completed' || 
        order.subOrders?.some(so => so.status === 'completed' || so.status === 'delivered');
    
    // Get items for review
    const reviewItems = allItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        imageUrl: item.imageUrl,
    }));

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 flex justify-between items-center rounded-sm shadow-sm">
                <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Quay lại
                </Button>
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">Mã đơn hàng: {order.orderNumber}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-shopee-orange font-medium uppercase">
                        {getStatusText(order.status)}
                    </span>
                </div>
            </div>

            {/* Address */}
            <div className="bg-white p-6 rounded-sm shadow-sm space-y-4">
                <div className="flex justify-between items-end border-b pb-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xl font-medium">
                            <MapPin className="h-5 w-5 text-shopee-orange" /> Địa chỉ nhận hàng
                        </div>
                        <div className="pl-7">
                            <span className="font-bold">{order.shippingName}</span>
                            <span className="mx-2 text-gray-400">|</span>
                            <span>{order.shippingPhone}</span>
                            <div className="text-gray-500 mt-1">{order.shippingAddress}</div>
                        </div>
                    </div>
                </div>

                {order.subOrders?.map(subOrder => (
                    subOrder.trackingNumber && (
                        <div key={subOrder.id} className="flex gap-4 items-start pl-7 pt-2">
                            <Truck className="h-5 w-5 text-gray-500 mt-1" />
                            <div className="flex-1">
                                <div className="font-medium">Thông tin vận chuyển</div>
                                <div className="text-sm text-gray-600 space-y-1 mt-1">
                                    <div>Mã vận đơn: {subOrder.trackingNumber}</div>
                                    <div className="text-green-600">{getStatusText(subOrder.status)}</div>
                                    {subOrder.shippedAt && (
                                        <div className="text-xs text-gray-400">
                                            Giao hàng: {new Date(subOrder.shippedAt).toLocaleString('vi-VN')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                ))}
            </div>

            {/* Products */}
            <div className="bg-white p-6 rounded-sm shadow-sm space-y-4">
                <div className="flex items-center gap-2 font-medium border-b pb-4">
                    <div className="flex-1">Sản phẩm</div>
                    <div className="w-32 text-center">Đơn giá</div>
                    <div className="w-20 text-center">SL</div>
                    <div className="w-32 text-center">Thành tiền</div>
                </div>

                <div className="divide-y">
                    {allItems.map(item => (
                        <div key={item.id} className="py-4 flex items-center gap-4">
                            <img 
                                src={item.imageUrl || 'https://placehold.co/100x100?text=Product'} 
                                alt={item.productName} 
                                className="h-20 w-20 object-cover border rounded-sm" 
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm">{item.productName}</h3>
                                {item.variantName && <div className="text-xs text-gray-500">{item.variantName}</div>}
                            </div>
                            <div className="w-32 text-center text-sm">{formatCurrency(item.unitPrice)}</div>
                            <div className="w-20 text-center text-sm">{item.quantity}</div>
                            <div className="w-32 text-center font-medium text-shopee-orange">
                                {formatCurrency(item.totalPrice)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white p-6 rounded-sm shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 font-medium text-lg">
                        <CreditCard className="h-5 w-5" /> Phương thức thanh toán
                    </div>
                    <div className="pl-7 text-sm">
                        {getPaymentMethodText(order.paymentMethod)}
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                            order.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                            {order.paymentStatus === 'paid' ? 'Đã thanh toán' :
                             order.paymentStatus === 'failed' ? 'Thất bại' :
                             'Chưa thanh toán'}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 text-sm border-l pl-8">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Tổng tiền hàng</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Phí vận chuyển</span>
                        <span>{formatCurrency(order.shippingTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Giảm giá</span>
                        <span>-{formatCurrency(order.discountTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-medium text-shopee-orange pt-4 border-t mt-2">
                        <span>Tổng thanh toán</span>
                        <span>{formatCurrency(order.grandTotal)}</span>
                    </div>
                </div>
            </div>

            {/* Customer Note */}
            {order.customerNote && (
                <div className="bg-white p-6 rounded-sm shadow-sm">
                    <h3 className="font-medium mb-2">Ghi chú</h3>
                    <p className="text-sm text-gray-600">{order.customerNote}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
                {needsPayment && (
                    <Button 
                        className="bg-shopee-orange hover:bg-shopee-orange-hover text-white"
                        onClick={handlePayNow}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Thanh toán ngay
                    </Button>
                )}
                
                {canCancel && (
                    <Button 
                        variant="outline" 
                        onClick={() => setShowCancelDialog(true)}
                        disabled={actionLoading}
                    >
                        Hủy đơn hàng
                    </Button>
                )}
                
                {canConfirmReceipt && (
                    <Button 
                        className="bg-shopee-orange hover:bg-shopee-orange-hover text-white"
                        onClick={handleConfirmReceipt}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Đã nhận hàng
                    </Button>
                )}
                
                {canReview && (
                    <Button 
                        variant="outline"
                        className="gap-2"
                        onClick={() => setShowReviewModal(true)}
                    >
                        <Star className="h-4 w-4" />
                        Đánh giá
                    </Button>
                )}
                
                <Button variant="outline" onClick={() => navigate("/user/purchase")}>
                    Quay lại
                </Button>
            </div>

            {/* Cancel Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hủy đơn hàng</DialogTitle>
                        <DialogDescription>
                            Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn hàng này.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Nhập lý do hủy đơn..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={4}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                            Đóng
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleCancelOrder}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Xác nhận hủy
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Review Modal */}
            <ReviewModal
                open={showReviewModal}
                onOpenChange={setShowReviewModal}
                items={reviewItems}
                onSuccess={() => toast.success("Cảm ơn bạn đã đánh giá!")}
            />
        </div>
    );
}
