import { Banknote } from "lucide-react";

interface PaymentSectionProps {
    selectedMethod?: 'cod' | 'momo' | 'vnpay' | 'zalopay';
    onMethodChange?: (method: 'cod' | 'momo' | 'vnpay' | 'zalopay') => void;
}

export function PaymentSection({ selectedMethod = 'cod', onMethodChange }: PaymentSectionProps) {
    const handleSelect = (method: 'cod' | 'momo' | 'vnpay' | 'zalopay') => {
        onMethodChange?.(method);
    };

    const paymentMethods = [
        {
            id: 'cod' as const,
            name: 'Thanh toán khi nhận hàng',
            icon: <Banknote className="h-10 w-10 text-green-600" />,
        },
        {
            id: 'momo' as const,
            name: 'Ví MoMo',
            icon: <img src="/payment-logos/momo.svg" alt="MoMo" className="h-10 w-10 object-contain" />,
        },
        {
            id: 'vnpay' as const,
            name: 'VNPay',
            icon: <img src="/payment-logos/vnpay.jpg" alt="VNPay" className="h-10 w-10 object-contain rounded" />,
        },
        {
            id: 'zalopay' as const,
            name: 'ZaloPay',
            icon: <img src="/payment-logos/zalopay.png" alt="ZaloPay" className="h-10 w-10 object-contain" />,
        },
    ];

    return (
        <div className="bg-white p-6 rounded-sm shadow-sm space-y-4">
            <h2 className="text-lg font-medium">Phương thức thanh toán</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {paymentMethods.map((method) => (
                    <div 
                        key={method.id}
                        className={`border rounded-sm p-4 cursor-pointer flex items-center flex-col justify-center gap-3 h-32 hover:border-shopee-orange transition-colors ${selectedMethod === method.id ? 'border-shopee-orange bg-orange-50' : ''}`} 
                        onClick={() => handleSelect(method.id)}
                    >
                        {method.icon}
                        <span className="font-medium text-center text-sm">{method.name}</span>
                    </div>
                ))}
            </div>

            {selectedMethod !== 'cod' && (
                <div className="bg-blue-50 p-4 rounded-sm text-sm text-blue-700">
                    Bạn sẽ được chuyển đến trang thanh toán sau khi đặt hàng.
                </div>
            )}
        </div>
    );
}
