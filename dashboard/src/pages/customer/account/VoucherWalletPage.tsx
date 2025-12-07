import { useState } from "react";
import { useCartStore, type Voucher } from "@/store/cartStore"; // Reusing cart store voucher logic for now, or mock
import { VoucherCard } from "@/components/customer/voucher/VoucherCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket } from "lucide-react";

// Mocking 'my vouchers' separate from 'available vouchers' for now
const MY_VOUCHERS: Voucher[] = [
    { id: '1', code: 'WELCOME50', type: 'fixed', value: 50000, minSpend: 200000, expiryDate: new Date('2025-12-31'), isExpired: false },
    { id: '2', code: 'FREESHIP', type: 'shipping', value: 30000, minSpend: 99000, expiryDate: new Date('2025-06-30'), isExpired: false },
    { id: '3', code: 'SUMMER20', type: 'percent', value: 20, minSpend: 500000, expiryDate: new Date('2023-12-01'), isExpired: true }, // Expired
];

export default function VoucherWalletPage() {
    const [filter, setFilter] = useState("ALL");
    const [inputCode, setInputCode] = useState("");

    const filteredVouchers = MY_VOUCHERS.filter(v => {
        if (filter === "ALL") return true;
        if (filter === "EXPIRED") return v.isExpired;
        return !v.isExpired; // Active
    });

    return (
        <div className="bg-white rounded-sm shadow-sm min-h-[500px]">
            <div className="flex justify-between items-center p-4 border-b">
                <h1 className="text-xl font-medium">My Vouchers</h1>
                <div className="flex gap-2">
                    <Input
                        placeholder="Add Voucher Code"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        className="w-[200px] h-9 text-sm"
                    />
                    <Button size="sm" className="h-9 bg-shopee-orange hover:bg-shopee-orange-hover text-white">Redeem</Button>
                </div>
            </div>

            <div className="sticky top-0 bg-white z-10 p-2 border-b">
                <Tabs defaultValue="ALL" onValueChange={setFilter}>
                    <TabsList className="bg-transparent justify-start h-auto p-0">
                        {['ALL', 'ACTIVE', 'EXPIRED'].map(type => (
                            <TabsTrigger
                                key={type}
                                value={type}
                                className="data-[state=active]:text-shopee-orange data-[state=active]:border-b-2 data-[state=active]:border-shopee-orange rounded-none px-6 py-2"
                            >
                                {type === 'ALL' ? 'All Vouchers' : (type === 'ACTIVE' ? 'Active' : 'History')}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVouchers.map(voucher => (
                    <VoucherCard key={voucher.id} voucher={voucher} />
                ))}
            </div>

            {filteredVouchers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Ticket className="h-10 w-10 text-gray-300" />
                    </div>
                    <p>No vouchers found</p>
                </div>
            )}
        </div>
    );
}
