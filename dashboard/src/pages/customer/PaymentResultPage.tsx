import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { orderService } from "@/services/order.service";

export default function PaymentResultPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const orderId = searchParams.get("orderId");
    const error = searchParams.get("error");
    const isSuccess = !error && window.location.pathname.includes("success");
    
    const [loading, setLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

    useEffect(() => {
        if (orderId) {
            checkPaymentStatus();
        } else {
            setLoading(false);
        }
    }, [orderId]);

    const checkPaymentStatus = async () => {
        try {
            const result = await orderService.getPaymentStatus(orderId!);
            setPaymentStatus(result.paymentStatus);
        } catch (error) {
            console.error("Failed to check payment status:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-shopee-orange mx-auto mb-4" />
                    <p className="text-gray-600">Đang xác nhận thanh toán...</p>
                </div>
            </div>
        );
    }

    const actualSuccess = isSuccess || paymentStatus === 'paid';

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                {actualSuccess ? (
                    <>
                        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">
                            Thanh toán thành công!
                        </h1>
                        <p className="text-gray-600 mb-6">
                            Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đang được xử lý.
                        </p>
                        {orderId && (
                            <p className="text-sm text-gray-500 mb-6">
                                Mã đơn hàng: <span className="font-medium">{orderId}</span>
                            </p>
                        )}
                        <div className="flex flex-col gap-3">
                            {orderId && (
                                <Button 
                                    className="bg-shopee-orange hover:bg-shopee-orange-hover text-white w-full"
                                    onClick={() => navigate(`/user/purchase/order/${orderId}`)}
                                >
                                    Xem đơn hàng
                                </Button>
                            )}
                            <Button 
                                variant="outline" 
                                className="w-full"
                                onClick={() => navigate("/")}
                            >
                                Tiếp tục mua sắm
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">
                            Thanh toán thất bại
                        </h1>
                        <p className="text-gray-600 mb-6">
                            {error ? decodeURIComponent(error) : "Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại."}
                        </p>
                        <div className="flex flex-col gap-3">
                            {orderId && (
                                <Button 
                                    className="bg-shopee-orange hover:bg-shopee-orange-hover text-white w-full"
                                    onClick={() => navigate(`/user/purchase/order/${orderId}`)}
                                >
                                    Xem đơn hàng
                                </Button>
                            )}
                            <Button 
                                variant="outline" 
                                className="w-full"
                                onClick={() => navigate("/cart")}
                            >
                                Quay lại giỏ hàng
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
