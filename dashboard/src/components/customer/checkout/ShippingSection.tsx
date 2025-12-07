import { useState } from "react";
import { Truck } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

export function ShippingSection() {
    const [selected, setSelected] = useState("standard");

    return (
        <div className="bg-white p-6 rounded-sm shadow-sm">
            <div className="flex items-center gap-2 text-lg font-medium mb-4">
                <Truck className="h-5 w-5 text-shopee-orange" />
                Shipping Option
            </div>

            <RadioGroup value={selected} onValueChange={setSelected} className="space-y-4">
                <div className="flex items-start space-x-4 p-4 border rounded-sm cursor-pointer hover:bg-gray-50 bg-blue-50/30">
                    <RadioGroupItem value="standard" id="standard" className="mt-1" />
                    <div className="flex-1">
                        <Label htmlFor="standard" className="text-base font-medium cursor-pointer">Standard Delivery</Label>
                        <p className="text-sm text-gray-500 mt-1">Receive by 8 Dec - 10 Dec</p>
                    </div>
                    <div className="font-medium text-shopee-orange">{formatCurrency(30000)}</div>
                </div>

                <div className="flex items-start space-x-4 p-4 border rounded-sm cursor-pointer hover:bg-gray-50">
                    <RadioGroupItem value="express" id="express" className="mt-1" />
                    <div className="flex-1">
                        <Label htmlFor="express" className="text-base font-medium cursor-pointer">Express Delivery</Label>
                        <p className="text-sm text-gray-500 mt-1">Receive by tomorrow, 8 Dec</p>
                    </div>
                    <div className="font-medium text-shopee-orange">{formatCurrency(55000)}</div>
                </div>
            </RadioGroup>
        </div>
    );
}
