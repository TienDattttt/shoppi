import { useEffect, useState } from "react";
import { shopService } from "@/services/shop.service";
import type { Shop } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Ban, CheckCircle, Store, Eye, Download } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/common/DataTable";
import { RejectShopDialog } from "@/components/admin/RejectShopDialog";
import { RequestRevisionDialog } from "@/components/admin/RequestRevisionDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Edit3 } from "lucide-react";

export default function ShopManagement() {
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");

    // Dialog states
    const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [revisionOpen, setRevisionOpen] = useState(false);

    useEffect(() => {
        loadShops();
    }, []);

    const loadShops = async () => {
        setLoading(true);
        try {
            const data = await shopService.getAllShops();
            setShops(data.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load shops");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (shop: Shop) => {
        try {
            await shopService.approveShop(shop._id);
            toast.success(`Shop ${shop.name} approved successfully`);
            loadShops();
        } catch (error) {
            toast.error("Failed to approve shop");
        }
    };

    const handleReject = async (reason: string) => {
        if (!selectedShop) return;
        try {
            await shopService.rejectShop(selectedShop._id, reason);
            toast.success(`Shop ${selectedShop.name} rejected`);
            loadShops();
        } catch (error) {
            toast.error("Failed to reject shop");
        }
    };

    const handleRevision = async (changes: string) => {
        if (!selectedShop) return;
        try {
            await shopService.requestRevision(selectedShop._id, changes);
            toast.success(`Revision requested for ${selectedShop.name}`);
            loadShops();
        } catch (error) {
            toast.error("Failed to request revision");
        }
    };

    const openRejectDialog = (shop: Shop) => {
        setSelectedShop(shop);
        setRejectOpen(true);
    };

    const openRevisionDialog = (shop: Shop) => {
        setSelectedShop(shop);
        setRevisionOpen(true);
    };

    const filteredShops = statusFilter === "all"
        ? shops
        : shops.filter(shop => shop.status.toLowerCase() === statusFilter);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const columns = [
        {
            header: "Shop Info",
            cell: (shop: Shop) => (
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                        <Store className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium">{shop.name}</span>
                        <span className="text-xs text-muted-foreground">{shop._id}</span>
                    </div>
                </div>
            )
        },
        {
            header: "Products",
            accessorKey: "products" as keyof Shop,
        },
        {
            header: "Revenue",
            cell: (shop: Shop) => formatCurrency(shop.revenue)
        },
        {
            header: "Rating",
            cell: (shop: Shop) => <span className="text-yellow-600 font-medium">⭐ {shop.rating}</span>
        },
        {
            header: "Status",
            cell: (shop: Shop) => (
                <Badge variant={shop.status === 'active' ? 'default' : 'destructive'}>
                    {shop.status === 'active' ? 'Active' : shop.status}
                </Badge>
            )
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (shop: Shop) => (
                <div className="flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                            <DropdownMenuSeparator />

                            {shop.status === 'pending' && (
                                <>
                                    <DropdownMenuItem className="text-green-600" onClick={() => handleApprove(shop)}>
                                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-amber-600" onClick={() => openRevisionDialog(shop)}>
                                        <Edit3 className="mr-2 h-4 w-4" /> Request Revision
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => openRejectDialog(shop)}>
                                        <Ban className="mr-2 h-4 w-4" /> Reject
                                    </DropdownMenuItem>
                                </>
                            )}

                            {shop.status === 'active' && (
                                <DropdownMenuItem className="text-destructive">
                                    <Ban className="mr-2 h-4 w-4" /> Suspend Shop
                                </DropdownMenuItem>
                            )}

                            {shop.status === 'rejected' && (
                                <DropdownMenuItem className="text-muted-foreground" disabled>
                                    <Ban className="mr-2 h-4 w-4" /> Already Rejected
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Shop Management</h1>
                    <p className="text-muted-foreground mt-1">Manage partner shops and approvals</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Export List
                    </Button>
                    <Button variant="outline" onClick={() => setStatusFilter("pending")}>Pending Approvals</Button>
                </div>
            </div>

            <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all">All Shops</TabsTrigger>
                    <TabsTrigger value="pending" className="text-amber-600">Pending</TabsTrigger>
                    <TabsTrigger value="active" className="text-green-600">Active</TabsTrigger>
                    <TabsTrigger value="rejected" className="text-red-600">Rejected</TabsTrigger>
                </TabsList>

                <TabsContent value={statusFilter} className="mt-0">
                    <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                        <DataTable
                            data={filteredShops}
                            columns={columns}
                            searchKey="name"
                            searchPlaceholder="Search shops..."
                            isLoading={loading}
                        />
                    </div>
                </TabsContent>
            </Tabs>

            <RejectShopDialog
                open={rejectOpen}
                onOpenChange={setRejectOpen}
                onConfirm={handleReject}
                shopName={selectedShop?.name || ""}
            />

            <RequestRevisionDialog
                open={revisionOpen}
                onOpenChange={setRevisionOpen}
                onConfirm={handleRevision}
                shopName={selectedShop?.name || ""}
            />
        </div>
    );
}
