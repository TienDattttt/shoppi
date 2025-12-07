import { Button } from "@/components/ui/button";
import { PackageOpen, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: LucideIcon;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    title = "No data found",
    description = "We couldn't find what you were looking for.",
    icon: Icon = PackageOpen,
    actionLabel,
    actionHref,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[300px]", className)}>
            <div className="bg-muted/50 p-4 rounded-full mb-4">
                <Icon className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>

            {(actionLabel && (actionHref || onAction)) && (
                actionHref ? (
                    <Button asChild>
                        <Link to={actionHref}>{actionLabel}</Link>
                    </Button>
                ) : (
                    <Button onClick={onAction}>{actionLabel}</Button>
                )
            )}
        </div>
    );
}
