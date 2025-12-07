import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ProductSkeleton() {
    return (
        <Card className="overflow-hidden h-full flex flex-col border-transparent shadow-none">
            <div className="aspect-square bg-muted">
                <Skeleton className="w-full h-full" />
            </div>
            <CardContent className="p-3 flex-1 flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />

                <div className="flex items-center gap-1 mt-auto">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-3 w-16" />
                </div>

                <div className="flex items-center justify-between mt-1">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-3 w-12" />
                </div>
            </CardContent>
        </Card>
    );
}

export function ProductListSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <ProductSkeleton key={i} />
            ))}
        </div>
    );
}
