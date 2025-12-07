import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Timer } from "lucide-react";
import { ProductCard, type Product } from "../product/ProductCard";
import { Button } from "@/components/ui/button";

// Mock Data
const FLASH_SALE_PRODUCTS: Product[] = [
    { id: "fs1", name: "Wireless Earbuds Pro", slug: "wireless-earbuds-pro", price: 299000, originalPrice: 899000, image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=200&auto=format&fit=crop", rating: 4.8, soldCount: 1542, shopLocation: "Hanoi" },
    { id: "fs2", name: "Smart Watch Series 7", slug: "smart-watch-series-7", price: 1590000, originalPrice: 3500000, image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=200&auto=format&fit=crop", rating: 4.9, soldCount: 892, shopLocation: "Hanoi" },
    { id: "fs3", name: "Fashion Backpack", slug: "fashion-backpack", price: 159000, originalPrice: 450000, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=200&auto=format&fit=crop", rating: 4.5, soldCount: 231, shopLocation: "HCM" },
    { id: "fs4", name: "Mechanical Keyboard", slug: "mechanical-keyboard", price: 890000, originalPrice: 1500000, image: "https://images.unsplash.com/photo-1587829741301-dc798b91a603?q=80&w=200&auto=format&fit=crop", rating: 4.7, soldCount: 412, shopLocation: "Danang" },
    { id: "fs5", name: "iPhone 15 Case", slug: "iphone-15-case", price: 49000, originalPrice: 120000, image: "https://images.unsplash.com/photo-1628116904674-8b6fa3528659?q=80&w=200&auto=format&fit=crop", rating: 4.6, soldCount: 5210, shopLocation: "Hanoi" },
    { id: "fs6", name: "Lipstick Matte", slug: "lipstick-matte", price: 129000, originalPrice: 280000, image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=200&auto=format&fit=crop", rating: 4.8, soldCount: 120, shopLocation: "HCM" },
];

export function FlashSale() {
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        // Set target time to next integer hour + 2 hours
        const target = new Date();
        target.setHours(target.getHours() + 2);
        target.setMinutes(0);
        target.setSeconds(0);

        const interval = setInterval(() => {
            const now = new Date();
            const difference = target.getTime() - now.getTime();

            if (difference <= 0) {
                // Reset or stop
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
            } else {
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft({ hours, minutes, seconds });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatTime = (unit: number) => unit.toString().padStart(2, '0');

    return (
        <div className="bg-white rounded-sm shadow-sm p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <div className="text-shopee-orange font-bold text-xl uppercase italic flex items-center gap-2">
                        <Timer className="h-6 w-6" />
                        Flash Sale
                    </div>
                    <div className="flex gap-1 text-white font-bold text-center">
                        <div className="bg-black px-1.5 py-0.5 rounded-sm min-w-[30px]">{formatTime(timeLeft.hours)}</div>
                        <span className="text-black font-normal">:</span>
                        <div className="bg-black px-1.5 py-0.5 rounded-sm min-w-[30px]">{formatTime(timeLeft.minutes)}</div>
                        <span className="text-black font-normal">:</span>
                        <div className="bg-black px-1.5 py-0.5 rounded-sm min-w-[30px]">{formatTime(timeLeft.seconds)}</div>
                    </div>
                </div>
                <Link to="/flash-sale" className="text-shopee-orange flex items-center gap-1 hover:opacity-80 font-medium text-sm">
                    View All <ChevronRight className="h-4 w-4" />
                </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {FLASH_SALE_PRODUCTS.map(product => (
                    <div key={product.id} className="w-[180px] shrink-0">
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>
        </div>
    );
}
