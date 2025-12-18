import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { bannerService, type Banner } from "@/services/banner.service";
import { Skeleton } from "@/components/ui/skeleton";

// Fallback banners in case API fails
const FALLBACK_BANNERS = [
    {
        id: "1",
        title: "Siêu Sale 12.12",
        description: "Giảm đến 50% cho tất cả sản phẩm điện tử",
        imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
        linkUrl: "/search?sort=best_selling",
        linkText: "Mua ngay",
        position: 1,
    },
    {
        id: "2",
        title: "Bộ sưu tập mới",
        description: "Khám phá xu hướng thời trang mới nhất",
        imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
        linkUrl: "/categories",
        linkText: "Khám phá",
        position: 2,
    },
    {
        id: "3",
        title: "Tuần lễ công nghệ",
        description: "Ưu đãi tốt nhất cho laptop và phụ kiện",
        imageUrl: "https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=2070&auto=format&fit=crop",
        linkUrl: "/search?q=laptop",
        linkText: "Xem ngay",
        position: 3,
    },
];

export function HeroBanner() {
    const [current, setCurrent] = useState(0);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const data = await bannerService.getActiveBanners();
                setBanners(data.length > 0 ? data : FALLBACK_BANNERS);
            } catch (error) {
                console.error("Failed to fetch banners:", error);
                setBanners(FALLBACK_BANNERS);
            } finally {
                setLoading(false);
            }
        };

        fetchBanners();
    }, []);

    const next = () => setCurrent((c) => (c + 1) % banners.length);
    const prev = () => setCurrent((c) => (c - 1 + banners.length) % banners.length);

    useEffect(() => {
        if (banners.length === 0) return;
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, [banners.length]);

    if (loading) {
        return <Skeleton className="h-[300px] md:h-[400px] rounded-lg" />;
    }

    if (banners.length === 0) {
        return null;
    }

    return (
        <div className="relative h-[300px] md:h-[400px] rounded-lg overflow-hidden group">
            <div
                className="absolute inset-0 flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${current * 100}%)` }}
            >
                {banners.map((banner) => (
                    <div key={banner.id} className="min-w-full relative">
                        <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex flex-col justify-center px-12 md:px-24">
                            <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 animate-in slide-in-from-left duration-500">
                                {banner.title}
                            </h2>
                            {banner.description && (
                                <p className="text-xl text-white/90 mb-8 max-w-lg animate-in slide-in-from-left duration-700 delay-100">
                                    {banner.description}
                                </p>
                            )}
                            {banner.linkUrl && (
                                <Link to={banner.linkUrl}>
                                    <Button size="lg" className="w-fit animate-in fade-in zoom-in duration-700 delay-200">
                                        {banner.linkText || "Mua ngay"}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls */}
            {banners.length > 1 && (
                <>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={prev}
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={next}
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>

                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {banners.map((_, i) => (
                            <button
                                key={i}
                                className={`h-2 w-2 rounded-full transition-all ${current === i ? "bg-white w-6" : "bg-white/50"}`}
                                onClick={() => setCurrent(i)}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
