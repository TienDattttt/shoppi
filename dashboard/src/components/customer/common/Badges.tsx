import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CustomBadgeProps {
    children: React.ReactNode;
    className?: string;
}

export function DiscountBadge({ children, className }: CustomBadgeProps) {
    return (
        <Badge variant="destructive" className={cn("bg-shopee-orange hover:bg-shopee-orange-hover", className)}>
            {children}
        </Badge>
    );
}

export function MallBadge({ className }: { className?: string }) {
    return (
        <Badge variant="secondary" className={cn("bg-red-600 text-white hover:bg-red-700 rounded-sm px-1 py-0 h-4 text-[10px]", className)}>
            Mall
        </Badge>
    );
}
