import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, ShoppingBag, Package, DollarSign } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { exportToCSV, exportToExcel } from "@/lib/export.utils";

export default function PartnerReports() {
    const [dateRange, setDateRange] = useState("7days");

    const handleExport = (format: 'csv' | 'excel') => {
        const data = [
            { date: '2024-01-01', orders: 12, revenue: 1500000, products_sold: 25 },
            { date: '2024-01-02', orders: 15, revenue: 2100000, products_sold: 32 },
            { date: '2024-01-03', orders: 8, revenue: 980000, products_sold: 15 },
            { date: '2024-01-04', orders: 20, revenue: 2800000, products_sold: 45 },
            { date: '2024-01-05', orders: 18, revenue: 2400000, products_sold: 38 },
        ];

        if (format === 'csv') {
            exportToCSV(data, 'shop-report');
            toast.success("CSV exported successfully");
        } else {
            exportToExcel(data, 'shop-report');
            toast.success("Excel exported successfully");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Báo cáo Shop</h1>
                    <p className="text-muted-foreground mt-1">Thống kê chi tiết hoạt động kinh doanh</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7days">7 ngày qua</SelectItem>
                            <SelectItem value="30days">30 ngày qua</SelectItem>
                            <SelectItem value="90days">90 ngày qua</SelectItem>
                            <SelectItem value="year">Năm nay</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => handleExport('csv')}>
                        <Download className="mr-2 h-4 w-4" /> CSV
                    </Button>
                    <Button onClick={() => handleExport('excel')}>
                        <Download className="mr-2 h-4 w-4" /> Excel
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Tổng doanh thu"
                    value="12,500,000đ"
                    icon={DollarSign}
                    trend={{ value: 12.5, label: "so với kỳ trước", isPositive: true }}
                />
                <StatCard
                    title="Đơn hàng"
                    value="156"
                    icon={ShoppingBag}
                    trend={{ value: 8.2, label: "so với kỳ trước", isPositive: true }}
                />
                <StatCard
                    title="Sản phẩm bán"
                    value="423"
                    icon={Package}
                    trend={{ value: 15.3, label: "so với kỳ trước", isPositive: true }}
                />
                <StatCard
                    title="Tỷ lệ chuyển đổi"
                    value="3.2%"
                    icon={TrendingUp}
                    trend={{ value: 0.5, label: "so với kỳ trước", isPositive: true }}
                />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Biểu đồ doanh thu</CardTitle>
                        <CardDescription>Doanh thu theo ngày trong kỳ</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RevenueChart />
                    </CardContent>
                </Card>

                <Card className="shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Đơn hàng theo trạng thái</CardTitle>
                        <CardDescription>Phân bổ đơn hàng hiện tại</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { label: 'Hoàn thành', value: 120, color: 'bg-green-500', percent: 77 },
                                { label: 'Đang giao', value: 25, color: 'bg-blue-500', percent: 16 },
                                { label: 'Chờ xử lý', value: 8, color: 'bg-yellow-500', percent: 5 },
                                { label: 'Đã hủy', value: 3, color: 'bg-red-500', percent: 2 },
                            ].map((item) => (
                                <div key={item.label} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{item.label}</span>
                                        <span className="font-medium">{item.value} ({item.percent}%)</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Products */}
            <Card className="shadow-premium border-border/50">
                <CardHeader>
                    <CardTitle>Sản phẩm bán chạy</CardTitle>
                    <CardDescription>Top 5 sản phẩm có doanh số cao nhất</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[
                            { name: 'Áo thun Premium Cotton', sold: 85, revenue: 4250000 },
                            { name: 'Quần Jeans Slim Fit', sold: 62, revenue: 3720000 },
                            { name: 'Giày Sneaker Classic', sold: 45, revenue: 2700000 },
                            { name: 'Túi xách da cao cấp', sold: 38, revenue: 1900000 },
                            { name: 'Mũ lưỡi trai thời trang', sold: 30, revenue: 450000 },
                        ].map((product, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center font-bold text-muted-foreground">
                                    #{idx + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-sm text-muted-foreground">{product.sold} đã bán</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-primary">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.revenue)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
