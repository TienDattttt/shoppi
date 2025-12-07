import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AddressSection() {
    return (
        <div className="bg-white p-6 rounded-sm shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-shopee-orange font-medium text-lg">
                    <MapPin className="h-5 w-5" />
                    Delivery Address
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                        <span className="font-bold">Tran Tien Dat (+84) 912 345 678</span>
                    </div>
                    <div className="text-sm text-gray-600">
                        So 1, Dai Co Viet, Hai Ba Trung, Ha Noi
                    </div>
                    <div className="text-xs text-shopee-orange border border-shopee-orange px-1 py-0.5 w-fit mt-2 rounded-sm">
                        Default
                    </div>
                </div>
                <Button variant="link" className="text-blue-500 p-0 h-auto">
                    Change
                </Button>
            </div>
        </div>
    );
}
