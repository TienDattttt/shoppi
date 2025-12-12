import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AddressSection } from "@/components/customer/checkout/AddressSection";
import { ShippingSection } from "@/components/customer/checkout/ShippingSection";
import { PaymentSection } from "@/components/customer/checkout/PaymentSection";
import { VoucherSection } from "@/components/customer/checkout/VoucherSection";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { orderService } from "@/services/order.service";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tickets, Loader2 } from "lucide-react";

export default function CheckoutPage() {
    const navigate = useNavigate();
    const { items, subtotal, fetchCart } = useCartStore();
    const { token } = useAuthStore();
    
    const [loading, setLoading] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'momo' | 'vnpay' | 'zalopay'>('cod');
    const [customerNote, setCustomerNote] = useState("");
    const [appliedVoucher, setAppliedVoucher] = useState<{
        code: string;
        discount: number;
        voucherId: string;
    } | null>(null);

    const selectedItems = items.filter(i => i.selected);

    if (!token) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h2 className="text-xl font-medium mb-4">Vui lòng đăng nhập để thanh toán</h2>
                <Button onClick={() => navigate("/login")}>Đăng nhập</Button>
            </div>
        );
    }

    if (selectedItems.length === 0) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h2 className="text-xl font-medium mb-4">Không có sản phẩm nào được chọn</h2>
                <Button onClick={() => navigate("/cart")}>Quay lại giỏ hàng</Button>
            </div>
        );
    }

    const shippingFee = 30000; // TODO: Calculate from API
    const discountAmount = appliedVoucher?.discount || 0;
    const finalTotal = subtotal() + shippingFee - discountAmount;

    const handlePlaceOrder = async () => {
        if (!selectedAddressId) {
            toast.error("Vui lòng chọn địa chỉ giao hàng");
            return;
        }

        setLoading(true);
        try {
            const cartItemIds = selectedItems.map(item => item.id);
            console.log("Checkout with cart item IDs:", cartItemIds);
            console.log("Selected items:", selectedItems);
            
            const result = await orderService.checkout({
                cartItemIds,
                shippingAddressId: selectedAddressId,
                paymentMethod,
                customerNote: customerNote || undefined,
                voucherCode: appliedVoucher?.code,
            });

            // If payment method is not COD, redirect to payment
            if (paymentMethod !== 'cod' && result.payment?.payUrl) {
                window.location.href = result.payment.payUrl;
                return;
            }

            // Check if payment failed (e.g., ZaloPay unavailable)
            if (result.payment?.status === 'failed') {
                toast.error(result.payment.error || "Thanh toán thất bại. Đơn hàng đã được tạo, vui lòng thử lại.");
                await fetchCart();
                navigate(`/user/purchase/order/${result.order.id}`);
                return;
            }

            // COD - order created successfully
            toast.success("Đặt hàng thành công!");
            
            // Clear cart and refresh
            await fetchCart();
            
            // Redirect to order detail
            navigate(`/user/purchase/order/${result.order.id}`);
        } catch (error: any) {
            console.error("Checkout error:", error);
            toast.error(error.response?.data?.message || "Đặt hàng thất bại. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <div className="container mx-auto px-4 py-6 space-y-4">
                <div className="text-2xl font-normal text-shopee-orange mb-4 border-b pb-4 flex items-center gap-2">
                    <Tickets className="h-6 w-6" /> Thanh toán
                </div>

                <AddressSection 
                    selectedAddressId={selectedAddressId}
                    onAddressChange={setSelectedAddressId}
                />

                {/* Products List */}
                <div className="bg-white p-6 rounded-sm shadow-sm space-y-6">
                    <h2 className="text-lg font-medium">Sản phẩm</h2>
                    <div className="divide-y">
                        {selectedItems.map((item) => (
                            <div key={item.id} className="py-4 flex gap-4 items-center">
                                <img src={item.image} alt={item.name} className="h-16 w-16 object-cover rounded-sm border" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium truncate">{item.name}</h3>
                                    {item.variant && <p className="text-xs text-muted-foreground">Phân loại: {item.variant}</p>}
                                </div>
                                <div className="text-sm">x{item.quantity}</div>
                                <div className="font-medium">{formatCurrency(item.price * item.quantity)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <ShippingSection />

                <VoucherSection 
                    orderTotal={subtotal()}
                    appliedVoucher={appliedVoucher}
                    onApplyVoucher={setAppliedVoucher}
                />

                <PaymentSection 
                    selectedMethod={paymentMethod}
                    onMethodChange={setPaymentMethod}
                />

                {/* Customer Note */}
                <div className="bg-white p-6 rounded-sm shadow-sm">
                    <h2 className="text-lg font-medium mb-4">Ghi chú</h2>
                    <textarea
                        className="w-full border rounded-sm p-3 text-sm"
                        placeholder="Ghi chú cho người bán..."
                        rows={3}
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                    />
                </div>

                {/* Summary */}
                <div className="bg-white p-6 rounded-sm shadow-sm">
                    <div className="flex justify-end border-b pb-4">
                        <div className="w-full md:w-1/3 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tổng tiền hàng:</span>
                                <span>{formatCurrency(subtotal())}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Phí vận chuyển:</span>
                                <span>{formatCurrency(shippingFee)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Giảm giá voucher:</span>
                                    <span>-{formatCurrency(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-medium pt-2 border-t mt-2">
                                <span>Tổng thanh toán:</span>
                                <span className="text-shopee-orange text-2xl">{formatCurrency(finalTotal)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 items-center gap-6">
                        <p className="text-xs text-gray-500 max-w-sm text-right">
                            Nhấn "Đặt hàng" đồng nghĩa với việc bạn đồng ý tuân theo Điều khoản Shoppi.
                        </p>
                        <Button
                            className="bg-shopee-orange hover:bg-shopee-orange-hover text-white px-12 h-12 text-lg rounded-sm"
                            onClick={handlePlaceOrder}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                "Đặt hàng"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
