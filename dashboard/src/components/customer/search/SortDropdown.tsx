import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface SortDropdownProps {
    value?: string;
    onChange: (value: string) => void;
}

export function SortDropdown({ value = "relevance", onChange }: SortDropdownProps) {
    // Top Tabs style for "Relevance", "Latest", "Top Sales"
    // Dropdown for "Price"

    return (
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-2 rounded-sm gap-2 w-full overflow-x-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap px-2">Sort by</span>

            <SortButton
                active={value === "relevance"}
                onClick={() => onChange("relevance")}
            >
                Relevance
            </SortButton>

            <SortButton
                active={value === "latest"}
                onClick={() => onChange("latest")}
            >
                Latest
            </SortButton>

            <SortButton
                active={value === "top_sales"}
                onClick={() => onChange("top_sales")}
            >
                Top Sales
            </SortButton>

            <Select
                value={value.startsWith("price") ? value : undefined}
                onValueChange={onChange}
            >
                <SelectTrigger className="w-[180px] bg-white h-9">
                    <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

function SortButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
    return (
        <Button
            variant={active ? "default" : "outline"}
            size="sm"
            onClick={onClick}
            className={active ? "bg-shopee-orange hover:bg-shopee-orange-hover text-white border-shopee-orange" : "bg-white border-transparent hover:bg-gray-50 text-gray-700"}
        >
            {children}
        </Button>
    )
}
