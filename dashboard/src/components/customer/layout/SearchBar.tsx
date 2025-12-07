import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
    className?: string;
    placeholder?: string;
}

export function SearchBar({ className, placeholder = "Search for products..." }: SearchBarProps) {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <form onSubmit={handleSearch} className={cn("relative flex w-full max-w-xl items-center", className)}>
            <Input
                type="text"
                placeholder={placeholder}
                className="pr-10 bg-muted/50 focus:bg-background transition-colors"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="absolute right-0 top-0 h-full text-muted-foreground hover:text-primary hover:bg-transparent"
            >
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
            </Button>
        </form>
    );
}
