import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Truck, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function OrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Mock Detail Data
    const order = {
        id: id,
        status: "To Receive",
        shopName: "Fashion Hub",
        address: {
            name: "Tran Tien Dat",
            phone: "(+84) 912 345 678",
            fullAddress: "So 1, Dai Co Viet, Hai Ba Trung, Ha Noi"
        },
        shipping: {
            method: "Express Delivery",
            trackingId: "SPX123456789",
            status: "Parcel has been picked up by shipping carrier",
            time: "07-12-2024 10:30"
        },
        items: [
            {
                id: "p2",
                name: "Cotton T-Shirt Basic",
                image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
                variant: "L, White",
                price: 120000,
                quantity: 2
            },
            {
                id: "p3",
                name: "Denim Jeans Slim Fit",
                image: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
                variant: "32, Blue",
                price: 350000,
                quantity: 1
            }
        ],
        paymentMethod: "Cash on Delivery",
        subtotal: 590000,
        shippingFee: 30000,
        discount: 0,
        total: 620000
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 flex justify-between items-center rounded-sm shadow-sm">
                <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">Order ID: {order.id}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-shopee-orange font-medium uppercase">{order.status}</span>
                </div>
            </div>

            {/* Address */}
            <div className="bg-white p-6 rounded-sm shadow-sm space-y-4">
                <div className="flex justify-between items-end border-b pb-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xl font-medium">
                            <MapPin className="h-5 w-5 text-shopee-orange" /> Delivery Address
                        </div>
                        <div className="pl-7">
                            <span className="font-bold">{order.address.name}</span>
                            <span className="mx-2 text-gray-400">|</span>
                            <span>{order.address.phone}</span>
                            <div className="text-gray-500 mt-1">{order.address.fullAddress}</div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 items-start pl-7 pt-2">
                    <Truck className="h-5 w-5 text-gray-500 mt-1" />
                    <div className="flex-1">
                        <div className="font-medium">Shipping Info</div>
                        <div className="text-sm text-gray-600 space-y-1 mt-1">
                            <div>{order.shipping.method} - {order.shipping.trackingId}</div>
                            <div className="text-green-600">{order.shipping.status}</div>
                            <div className="text-xs text-gray-400">{order.shipping.time}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Products */}
            <div className="bg-white p-6 rounded-sm shadow-sm space-y-4">
                <div className="flex items-center gap-2 font-medium border-b pb-4">
                    <div className="flex-1">Products</div>
                    <div className="w-32 text-center">Unit Price</div>
                    <div className="w-20 text-center">Qty</div>
                    <div className="w-32 text-center">Total</div>
                </div>

                <div className="divide-y">
                    {order.items.map(item => (
                        <div key={item.id} className="py-4 flex items-center gap-4">
                            <img src={item.image} alt={item.name} className="h-20 w-20 object-cover border rounded-sm" />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm">{item.name}</h3>
                                {item.variant && <div className="text-xs text-gray-500">{item.variant}</div>}
                            </div>
                            <div className="w-32 text-center text-sm">{formatCurrency(item.price)}</div>
                            <div className="w-20 text-center text-sm">{item.quantity}</div>
                            <div className="w-32 text-center font-medium text-shopee-orange">{formatCurrency(item.price * item.quantity)}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white p-6 rounded-sm shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 font-medium text-lg">
                        <CreditCard className="h-5 w-5" /> Payment Method
                    </div>
                    <div className="pl-7 text-sm">{order.paymentMethod}</div>
                </div>

                <div className="space-y-2 text-sm border-l pl-8">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Merchandise Subtotal</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Shipping Total</span>
                        <span>{formatCurrency(order.shippingFee)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Voucher Discount</span>
                        <span>-{formatCurrency(order.discount)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-medium text-shopee-orange pt-4 border-t mt-2">
                        <span>Total Payment</span>
                        <span>{formatCurrency(order.total)}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <Button variant="outline" className="w-32">Re-Order</Button>
                <Button className="w-32 bg-shopee-orange hover:bg-shopee-orange-hover text-white">Contact Seller</Button>
            </div>
        </div>
    );
}
