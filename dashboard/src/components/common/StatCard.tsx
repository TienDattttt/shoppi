import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";


interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number; // percentage
        label: string;
        isPositive: boolean;
    };
    className?: string;
}

export function StatCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    className
}: StatCardProps) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {(description || trend) && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                        {trend && (
                            <span className={`flex items-center mr-2 font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {trend.isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                                {trend.value}%
                            </span>
                        )}
                        {description && <span>{description}</span>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
