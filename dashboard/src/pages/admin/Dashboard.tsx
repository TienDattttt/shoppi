import { RevenueChart } from "@/components/charts/RevenueChart";
import {
    Activity,
    CreditCard,
    DollarSign,
    Users,
    Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Tổng quan</h1>
                    <p className="text-muted-foreground mt-1">Chào mừng quay trở lại, Admin!</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="shadow-sm">
                        <Download className="mr-2 h-4 w-4" />
                        Xuất báo cáo
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                    <TabsTrigger value="analytics">Phân tích</TabsTrigger>
                    <TabsTrigger value="reports">Báo cáo</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="shadow-premium border-border/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Tổng doanh thu
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">$45,231.89</div>
                                <p className="text-xs text-muted-foreground">
                                    +20.1% so với tháng trước
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-premium border-border/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Người đăng ký
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+2350</div>
                                <p className="text-xs text-muted-foreground">
                                    +180.1% so với tháng trước
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-premium border-border/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Đơn hàng</CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+12,234</div>
                                <p className="text-xs text-muted-foreground">
                                    +19% so với tháng trước
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-premium border-border/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Hoạt động ngay
                                </CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+573</div>
                                <p className="text-xs text-muted-foreground">
                                    +201 kể từ giờ trước
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4 shadow-premium border-border/50">
                            <CardHeader>
                                <CardTitle>Biểu đồ doanh thu</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <RevenueChart />
                            </CardContent>
                        </Card>
                        <Card className="col-span-3 shadow-premium border-border/50">
                            <CardHeader>
                                <CardTitle>Giao dịch gần đây</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-8">
                                    {[
                                        { name: "Nguyễn Văn A", email: "a@example.com", amount: "+$1,999.00" },
                                        { name: "Trần Thị B", email: "b@example.com", amount: "+$39.00" },
                                        { name: "Lê Văn C", email: "c@example.com", amount: "+$299.00" },
                                        { name: "Phạm Thị D", email: "d@example.com", amount: "+$99.00" },
                                        { name: "Hoàng Văn E", email: "e@example.com", amount: "+$39.00" }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center">
                                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                                <Users className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="ml-4 space-y-1">
                                                <p className="text-sm font-medium leading-none">
                                                    {item.name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {item.email}
                                                </p>
                                            </div>
                                            <div className="ml-auto font-medium">{item.amount}</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
