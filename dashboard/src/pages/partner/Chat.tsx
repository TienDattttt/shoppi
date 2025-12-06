import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Search } from "lucide-react";

export default function Chat() {
    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">Tin nhắn</h1>

            <div className="flex-1 grid grid-cols-12 gap-6 h-full min-h-0">
                {/* Chat List */}
                <Card className="col-span-4 h-full shadow-premium border-border/50 flex flex-col">
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Tìm kiếm khách hàng..." className="pl-9" />
                        </div>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${i === 1 ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                                    <Avatar>
                                        <AvatarImage src={`https://avatar.vercel.sh/${i}`} />
                                        <AvatarFallback>KH</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <p className="font-medium text-sm truncate">Nguyen Van Khach {i}</p>
                                            <span className="text-xs text-muted-foreground">12:30</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">Cho mình hỏi sản phẩm này còn màu đen không?</p>
                                    </div>
                                    {i === 2 && <span className="h-2 w-2 rounded-full bg-primary" />}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </Card>

                {/* Chat Window */}
                <Card className="col-span-8 h-full shadow-premium border-border/50 flex flex-col overflow-hidden">
                    <div className="p-4 border-b flex items-center gap-3 bg-muted/20">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="https://avatar.vercel.sh/1" />
                            <AvatarFallback>KH</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium text-sm">Nguyen Van Khach 1</p>
                            <p className="text-xs text-green-600 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-600" /> Online
                            </p>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src="https://avatar.vercel.sh/1" />
                                    <AvatarFallback>KH</AvatarFallback>
                                </Avatar>
                                <div className="bg-muted p-3 rounded-lg rounded-tl-none max-w-[80%]">
                                    <p className="text-sm">Xin chào shop, cho mình hỏi sản phẩm Tai nghe Sony còn màu đen không ạ?</p>
                                    <span className="text-[10px] text-muted-foreground block mt-1">12:30</span>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <div className="bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none max-w-[80%]">
                                    <p className="text-sm">Chào bạn, sản phẩm bên mình vẫn còn sẵn màu đen nhé ạ! Bạn có thể đặt hàng ngay để được giao sớm nhất.</p>
                                    <span className="text-[10px] text-primary-foreground/70 block mt-1">12:32</span>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t bg-background mt-auto">
                        <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                            <Input placeholder="Nhập tin nhắn..." className="flex-1" />
                            <Button type="submit" size="icon">
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    );
}
