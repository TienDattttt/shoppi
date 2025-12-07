import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
    {
        id: 1,
        image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
        title: "Super Sale 12.12",
        description: "Up to 50% off on all electronics"
    },
    {
        id: 2,
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
        title: "New Collection",
        description: "Discover the latest trends in fashion"
    },
    {
        id: 3,
        image: "https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=2070&auto=format&fit=crop",
        title: "Tech Week",
        description: "Best deals on laptops and accessories"
    }
];

export function HeroBanner() {
    const [current, setCurrent] = useState(0);

    const next = () => setCurrent((c) => (c + 1) % slides.length);
    const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);

    useEffect(() => {
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative h-[300px] md:h-[400px] rounded-lg overflow-hidden group">
            <div
                className="absolute inset-0 flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${current * 100}%)` }}
            >
                {slides.map((slide) => (
                    <div key={slide.id} className="min-w-full relative">
                        <img
                            src={slide.image}
                            alt={slide.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex flex-col justify-center px-12 md:px-24">
                            <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 animate-in slide-in-from-left duration-500">{slide.title}</h2>
                            <p className="text-xl text-white/90 mb-8 max-w-lg animate-in slide-in-from-left duration-700 delay-100">{slide.description}</p>
                            <Button size="lg" className="w-fit animate-in fade-in zoom-in duration-700 delay-200">Shop Now</Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls */}
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
                {slides.map((_, i) => (
                    <button
                        key={i}
                        className={`h-2 w-2 rounded-full transition-all ${current === i ? "bg-white w-6" : "bg-white/50"}`}
                        onClick={() => setCurrent(i)}
                    />
                ))}
            </div>
        </div>
    );
}
