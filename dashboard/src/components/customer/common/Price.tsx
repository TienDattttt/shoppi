import { cn } from "@/lib/utils";

interface PriceProps {
    price: number;
    originalPrice?: number;
    currency?: string;
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
}

export function Price({
    price,
    originalPrice,
    currency = "đ",
    className,
    size = "md"
}: PriceProps) {
    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const discount = originalPrice && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    const sizeClasses = {
        sm: "text-sm",
        md: "text-base",
        lg: "text-xl",
        xl: "text-2xl"
    };

    return (
        <div className={cn("flex items-baseline gap-2", className)}>
            <span className={cn("font-bold text-primary", sizeClasses[size])}>
                {formatPrice(price)}{currency}
            </span>
            {originalPrice && originalPrice > price && (
                <>
                    <span className="text-xs text-muted-foreground line-through decoration-muted-foreground/50">
                        {formatPrice(originalPrice)}{currency}
                    </span>
                    <span className="text-[10px] sm:text-xs font-medium text-destructive bg-destructive/10 px-1 rounded-sm">
                        -{discount}%
                    </span>
                </>
            )}
        </div>
    );
}
