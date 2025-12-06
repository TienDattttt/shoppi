import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare } from "lucide-react";

export default function ReviewManagement() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Đánh giá & Nhận xét</h1>
                <p className="text-muted-foreground mt-1">Quản lý phản hồi từ khách hàng</p>
            </div>

            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <Card key={i} className="shadow-premium border-border/50">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <Avatar>
                                        <AvatarImage src={`https://avatar.vercel.sh/${i}`} />
                                        <AvatarFallback>KH</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm">Nguyen Van Khach {i}</p>
                                            <span className="text-xs text-muted-foreground">• 2 ngày trước</span>
                                        </div>
                                        <div className="flex items-center text-yellow-500 mt-0.5">
                                            <Star className="h-3 w-3 fill-current" />
                                            <Star className="h-3 w-3 fill-current" />
                                            <Star className="h-3 w-3 fill-current" />
                                            <Star className="h-3 w-3 fill-current" />
                                            <Star className="h-3 w-3 fill-current" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <img src="https://picsum.photos/50" className="h-10 w-10 rounded object-cover border" alt="Product" />
                                    <div className="text-xs text-muted-foreground">
                                        <p className="max-w-[150px] truncate">Tai nghe Bluetooth Sony WH-1000XM5</p>
                                        <p>Phân loại: Đen</p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm">Sản phẩm dùng rất tốt, giao hàng nhanh, đóng gói cẩn thận. Shop tư vấn nhiệt tình. Sẽ ủng hộ tiếp!</p>

                            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                                <p className="text-xs font-semibold flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" /> Phản hồi của Shop
                                </p>
                                <div className="flex gap-2">
                                    <Textarea placeholder="Nhập phản hồi của bạn..." className="min-h-[40px] text-sm" />
                                    <Button size="sm">Gửi</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
