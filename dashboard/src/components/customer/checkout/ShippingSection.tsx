import { useState } from "react";
import { Truck } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

export function ShippingSection() {
    const [selected, setSelected] = useState("standard");

    // Calculate estimated delivery dates
    const today = new Date();
    const standardStart = new Date(today);
    standardStart.setDate(today.getDate() + 3);
    const standardEnd = new Date(today);
    standardEnd.setDate(today.getDate() + 5);
    
    const expressDate = new Date(today);
    expressDate.setDate(today.getDate() + 1);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
    };

    return (
        <div className="bg-white p-6 rounded-sm shadow-sm">
            <div className="flex items-center gap-2 text-lg font-medium mb-4">
                <Truck className="h-5 w-5 text-shopee-orange" />
                Phương thức vận chuyển
            </div>

            <RadioGroup value={selected} onValueChange={setSelected} className="space-y-4">
                <div 
                    className={`flex items-start space-x-4 p-4 border rounded-sm cursor-pointer hover:bg-gray-50 ${selected === 'standard' ? 'bg-blue-50/30 border-shopee-orange' : ''}`}
                    onClick={() => setSelected('standard')}
                >
                    <RadioGroupItem value="standard" id="standard" className="mt-1" />
                    <div className="flex-1">
                        <Label htmlFor="standard" className="text-base font-medium cursor-pointer">Giao hàng tiêu chuẩn</Label>
                        <p className="text-sm text-gray-500 mt-1">
                            Nhận hàng từ {formatDate(standardStart)} - {formatDate(standardEnd)}
                        </p>
                    </div>
                    <div className="font-medium text-shopee-orange">{formatCurrency(30000)}</div>
                </div>

                <div 
                    className={`flex items-start space-x-4 p-4 border rounded-sm cursor-pointer hover:bg-gray-50 ${selected === 'express' ? 'bg-blue-50/30 border-shopee-orange' : ''}`}
                    onClick={() => setSelected('express')}
                >
                    <RadioGroupItem value="express" id="express" className="mt-1" />
                    <div className="flex-1">
                        <Label htmlFor="express" className="text-base font-medium cursor-pointer">Giao hàng nhanh</Label>
                        <p className="text-sm text-gray-500 mt-1">
                            Nhận hàng vào ngày mai, {formatDate(expressDate)}
                        </p>
                    </div>
                    <div className="font-medium text-shopee-orange">{formatCurrency(55000)}</div>
                </div>
            </RadioGroup>
        </div>
    );
}
