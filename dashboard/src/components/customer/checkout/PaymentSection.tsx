import { useState } from "react";
import { CreditCard, Banknote, QrCode } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export function PaymentSection() {
    const [paymentMethod, setPaymentMethod] = useState("cod");

    return (
        <div className="bg-white p-6 rounded-sm shadow-sm space-y-4">
            <h2 className="text-lg font-medium">Payment Method</h2>

            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`border rounded-sm p-4 cursor-pointer flex items-center flex-col justify-center gap-3 h-32 hover:border-shopee-orange ${paymentMethod === 'cod' ? 'border-shopee-orange bg-orange-50' : ''}`} onClick={() => setPaymentMethod('cod')}>
                    <Banknote className="h-8 w-8 text-green-600" />
                    <span className="font-medium">Cash on Delivery</span>
                </div>

                <div className={`border rounded-sm p-4 cursor-pointer flex items-center flex-col justify-center gap-3 h-32 hover:border-shopee-orange ${paymentMethod === 'qr' ? 'border-shopee-orange bg-orange-50' : ''}`} onClick={() => setPaymentMethod('qr')}>
                    <QrCode className="h-8 w-8 text-blue-600" />
                    <span className="font-medium">QR Pay / E-Wallet</span>
                </div>

                <div className={`border rounded-sm p-4 cursor-pointer flex items-center flex-col justify-center gap-3 h-32 hover:border-shopee-orange ${paymentMethod === 'bank' ? 'border-shopee-orange bg-orange-50' : ''}`} onClick={() => setPaymentMethod('bank')}>
                    <CreditCard className="h-8 w-8 text-purple-600" />
                    <span className="font-medium">Bank Transfer</span>
                </div>
            </RadioGroup>

            {paymentMethod === 'qr' && (
                <div className="bg-blue-50 p-4 rounded-sm text-sm text-blue-700">
                    You will be redirected to payment gateway after placing order.
                </div>
            )}
        </div>
    );
}
