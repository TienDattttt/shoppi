import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MOCK_ADDRESSES = [
    {
        id: 1,
        name: "Tran Tien Dat",
        phone: "(+84) 912 345 678",
        address: "So 1, Dai Co Viet",
        ward: "Phuong Bach Khoa",
        district: "Quan Hai Ba Trung",
        city: "Ha Noi",
        isDefault: true
    },
    {
        id: 2,
        name: "Tran Tien Dat",
        phone: "(+84) 987 654 321",
        address: "So 10, Duong Lang",
        ward: "Phuong Lang Thuong",
        district: "Quan Dong Da",
        city: "Ha Noi",
        isDefault: false
    }
];

export default function AddressBookPage() {
    const [addresses] = useState(MOCK_ADDRESSES);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
                <h1 className="text-xl font-medium">My Addresses</h1>
                <Button className="bg-shopee-orange hover:bg-shopee-orange-hover text-white">
                    <Plus className="mr-2 h-4 w-4" /> Add New Address
                </Button>
            </div>

            <div className="space-y-4">
                {addresses.map((addr) => (
                    <div key={addr.id} className="border-b pb-4 last:border-0 flex justify-between items-start">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-base border-r pr-2 border-gray-300">{addr.name}</span>
                                <span className="text-gray-500 text-sm">{addr.phone}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                                {addr.address}
                            </div>
                            <div className="text-sm text-gray-600">
                                {addr.ward}, {addr.district}, {addr.city}
                            </div>
                            <div className="flex gap-2 mt-2">
                                {addr.isDefault && (
                                    <Badge variant="outline" className="text-shopee-orange border-shopee-orange font-normal">Default</Badge>
                                )}
                                <Badge variant="secondary" className="font-normal text-gray-500">Pickup Address</Badge>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 text-sm">
                            <div className="flex gap-2">
                                <button className="text-blue-500 hover:underline">Edit</button>
                                {!addr.isDefault && (
                                    <>
                                        <span className="text-gray-300">|</span>
                                        <button className="text-gray-500 hover:underline">Delete</button>
                                    </>
                                )}
                            </div>
                            {!addr.isDefault && (
                                <Button variant="outline" size="sm" className="h-7 text-xs mt-2">
                                    Set as Default
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
