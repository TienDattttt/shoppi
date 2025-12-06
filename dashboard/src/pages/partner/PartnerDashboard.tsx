import { RevenueChart } from "@/components/charts/RevenueChart";
import {
    ShoppingBag,
    Package,
    MessageSquare,
    Store,
    Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PartnerDashboard() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Kênh Đối Tác</h1>
                    <p className="text-muted-foreground mt-1">Quản lý cửa hàng và sản phẩm của bạn</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="shadow-sm">
                        <Download className="mr-2 h-4 w-4" />
                        Tải báo cáo
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-premium border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Đơn hàng mới
                        </CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-muted-foreground">
                            +2 so với hôm qua
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-premium border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Sản phẩm
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">45</div>
                        <p className="text-xs text-muted-foreground">
                            5 hết hàng
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-premium border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Đánh giá mới</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3</div>
                        <p className="text-xs text-muted-foreground">
                            1 cần phản hồi
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-premium border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Doanh thu hôm nay</CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,200,000đ</div>
                        <p className="text-xs text-muted-foreground">
                            +15% so với hôm qua
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4 shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Biểu đồ doanh thu shop</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <RevenueChart />
                    </CardContent>
                </Card>
                <Card className="col-span-3 shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Sản phẩm bán chạy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {['Áo thun premium', 'Quần jeans slimfit', 'Giày sneaker trắng'].map((item, i) => (
                            <div key={i} className="flex items-center mb-4 last:mb-0">
                                <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800 mr-3"></div>
                                <div>
                                    <p className="text-sm font-medium">{item}</p>
                                    <p className="text-xs text-muted-foreground">120 đã bán</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
