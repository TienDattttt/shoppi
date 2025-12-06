import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { VisitorChart } from "@/components/charts/VisitorChart";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function Reports() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Báo cáo & Phân tích</h1>
                    <p className="text-muted-foreground mt-1">Số liệu chi tiết về hoạt động kinh doanh</p>
                </div>
                <Button><Download className="mr-2 h-4 w-4" /> Xuất PDF</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Doanh thu toàn sàn</CardTitle>
                        <CardDescription>Biểu đồ xu hướng 7 ngày qua</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RevenueChart />
                    </CardContent>
                </Card>

                <Card className="shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Lượng truy cập hệ thống</CardTitle>
                        <CardDescription>Số người dùng active hàng ngày</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <VisitorChart />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
