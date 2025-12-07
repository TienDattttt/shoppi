import { useNavigate } from "react-router-dom";
import { AddressSection } from "../../components/customer/checkout/AddressSection";
import { ShippingSection } from "../../components/customer/checkout/ShippingSection";
import { PaymentSection } from "../../components/customer/checkout/PaymentSection";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tickets } from "lucide-react";

export default function CheckoutPage() {
    const navigate = useNavigate();
    const { items, total, discountAmount, subtotal } = useCartStore();

    const selectedItems = items.filter(i => i.selected);

    if (selectedItems.length === 0) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h2 className="text-xl font-medium mb-4">No items selected for checkout</h2>
                <Button onClick={() => navigate("/cart")}>Back to Cart</Button>
            </div>
        )
    }

    const shippingFee = 30000;
    const finalTotal = total() + shippingFee;

    const handlePlaceOrder = () => {
        toast.success("Order placed successfully! Redirecting...");
        setTimeout(() => {
            navigate("/");
        }, 2000);
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <div className="container mx-auto px-4 py-6 space-y-4">
                <div className="text-2xl font-normal text-shopee-orange mb-4 border-b pb-4 flex items-center gap-2">
                    <Tickets className="h-6 w-6" /> Checkout
                </div>

                <AddressSection />

                {/* Products List */}
                <div className="bg-white p-6 rounded-sm shadow-sm space-y-6">
                    <h2 className="text-lg font-medium">Products</h2>
                    <div className="divide-y">
                        {selectedItems.map((item) => (
                            <div key={item.id} className="py-4 flex gap-4 items-center">
                                <img src={item.image} alt={item.name} className="h-16 w-16 object-cover rounded-sm border" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium truncate">{item.name}</h3>
                                    {item.variant && <p className="text-xs text-muted-foreground">Variation: {item.variant}</p>}
                                </div>
                                <div className="text-sm">x{item.quantity}</div>
                                <div className="font-medium">{formatCurrency(item.price * item.quantity)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <ShippingSection />

                <PaymentSection />

                {/* Summary */}
                <div className="bg-white p-6 rounded-sm shadow-sm">
                    <div className="flex justify-end border-b pb-4">
                        <div className="w-full md:w-1/3 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Merchandise Subtotal:</span>
                                <span>{formatCurrency(subtotal())}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Shipping Total:</span>
                                <span>{formatCurrency(shippingFee)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Discount:</span>
                                <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-medium pt-2 border-t mt-2">
                                <span>Total Payment:</span>
                                <span className="text-shopee-orange text-2xl">{formatCurrency(finalTotal)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 items-center gap-6">
                        <p className="text-xs text-gray-500 max-w-sm text-right">
                            By clicking "Place Order", you agree to Shoppi's Terms of Service and Privacy Policy.
                        </p>
                        <Button
                            className="bg-shopee-orange hover:bg-shopee-orange-hover text-white px-12 h-12 text-lg rounded-sm"
                            onClick={handlePlaceOrder}
                        >
                            Place Order
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
