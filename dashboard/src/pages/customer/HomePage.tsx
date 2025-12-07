import { HeroBanner } from "@/components/customer/home/HeroBanner";
import { CategoryBar } from "@/components/customer/home/CategoryBar";
import { FlashSale } from "@/components/customer/home/FlashSale";
import { TopSearchSection } from "@/components/customer/home/TopSearchSection";
import { TodaySuggestions } from "@/components/customer/home/TodaySuggestions";

export default function HomePage() {
    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            {/* 1. Hero Banner */}
            <HeroBanner />

            {/* 2. Categories */}
            <CategoryBar />

            {/* 3. Flash Sale */}
            <FlashSale />

            {/* 4. Top Search */}
            <TopSearchSection />

            {/* 5. Infinite Suggestions */}
            <TodaySuggestions />
        </div>
    );
}
