import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
    images: string[];
    className?: string;
}

export function ProductGallery({ images, className }: ProductGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden rounded-md border bg-white group">
                <img
                    src={images[activeIndex]}
                    alt="Product Main"
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                />
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((img, idx) => (
                    <button
                        key={idx}
                        className={cn(
                            "relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-white transition-all hover:opacity-100",
                            activeIndex === idx ? "border-shopee-orange ring-1 ring-shopee-orange" : "opacity-70 hover:border-shopee-orange"
                        )}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => setActiveIndex(idx)}
                    >
                        <img src={img} alt={`Thumbnail ${idx}`} className="h-full w-full object-cover" />
                    </button>
                ))}
            </div>
        </div>
    );
}
