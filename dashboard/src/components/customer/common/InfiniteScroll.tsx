import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface InfiniteScrollProps {
    onLoadMore: () => void;
    hasMore: boolean;
    isLoading?: boolean;
    className?: string;
}

export function InfiniteScroll({
    onLoadMore,
    hasMore,
    isLoading = false,
    className
}: InfiniteScrollProps) {
    const observerTarget = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    onLoadMore();
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [onLoadMore, hasMore, isLoading]);

    return (
        <div ref={observerTarget} className={`w-full py-4 flex justify-center ${className || ""}`}>
            {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                </div>
            )}
        </div>
    );
}
