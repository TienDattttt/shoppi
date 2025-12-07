import { Minus, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Price } from "../common/Price";
import { type CartItem as CartItemType, useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";

interface CartItemProps {
    item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
    const { updateQuantity, toggleSelection, removeFromCart } = useCartStore();

    return (
        <div className="flex items-center gap-4 py-4 border-b last:border-0 bg-white px-4">
            <Checkbox
                checked={item.selected}
                onCheckedChange={() => toggleSelection(item.id)}
            />

            <div className="flex-1 flex gap-4">
                <img
                    src={item.image}
                    alt={item.name}
                    className="h-20 w-20 object-cover rounded-sm border bg-muted"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="text-sm font-medium line-clamp-2">{item.name}</h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-red-500"
                            onClick={() => removeFromCart(item.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>

                    {item.variant && (
                        <div className="text-xs text-muted-foreground bg-gray-50 w-fit px-2 py-0.5 rounded-sm mt-1">
                            Variation: {item.variant}
                        </div>
                    )}

                    <div className="flex items-end justify-between mt-2">
                        <Price price={item.price} originalPrice={item.originalPrice} />

                        <div className="flex items-center border rounded-sm h-7">
                            <button
                                className="w-7 h-full flex items-center justify-center border-r hover:bg-gray-50"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                                <Minus className="h-3 w-3" />
                            </button>
                            <input
                                className="w-10 text-center text-sm focus:outline-none"
                                value={item.quantity}
                                readOnly
                            />
                            <button
                                className="w-7 h-full flex items-center justify-center border-l hover:bg-gray-50"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                                <Plus className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
