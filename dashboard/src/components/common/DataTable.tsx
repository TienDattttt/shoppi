
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

interface DataTableProps<T> {
    data: T[];
    columns: {
        header: string;
        accessorKey?: keyof T;
        cell?: (item: T) => React.ReactNode;
        className?: string;
    }[];
    searchKey?: keyof T;
    searchPlaceholder?: string;
    onSearch?: (term: string) => void;
    isLoading?: boolean;
}

export function DataTable<T extends { _id: string | number }>({
    data,
    columns,
    searchKey,
    searchPlaceholder = "Search...",
    onSearch,
    isLoading
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Client-side filtering if onSearch is not provided
    const filteredData = data.filter((item) => {
        if (onSearch) return true; // Server-side search handled by parent
        if (!searchKey) return true;
        const value = item[searchKey];
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (onSearch) onSearch(term);
        setCurrentPage(1);
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading data...</div>;
    }

    return (
        <div className="space-y-4">
            {searchKey && (
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={handleSearch}
                            className="pl-9"
                        />
                    </div>
                </div>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col, index) => (
                                <TableHead key={index} className={col.className}>
                                    {col.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item) => (
                                <TableRow key={item._id}>
                                    {columns.map((col, index) => (
                                        <TableCell key={index} className={col.className}>
                                            {col.cell ? col.cell(item) : (item[col.accessorKey!] as React.ReactNode)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No results found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end space-x-2">
                <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages || 1}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
