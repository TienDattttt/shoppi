import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
    value: number;
    max?: number;
    size?: number;
    showCount?: boolean;
    count?: number;
    className?: string;
    readonly?: boolean;
    onChange?: (value: number) => void;
}

export function Rating({
    value,
    max = 5,
    size = 16,
    showCount = false,
    count,
    className,
    readonly = true,
    onChange
}: RatingProps) {
    return (
        <div className={cn("flex items-center gap-1", className)}>
            <div className="flex">
                {Array.from({ length: max }).map((_, i) => (
                    <Star
                        key={i}
                        size={size}
                        className={cn(
                            "transition-colors",
                            i < Math.floor(value)
                                ? "fill-primary text-primary"
                                : "fill-muted text-muted-foreground/30",
                            !readonly && "cursor-pointer hover:scale-110"
                        )}
                        onClick={() => !readonly && onChange?.(i + 1)}
                    />
                ))}
            </div>
            {showCount && count !== undefined && (
                <span className="text-xs text-muted-foreground ml-1">({count})</span>
            )}
        </div>
    );
}
