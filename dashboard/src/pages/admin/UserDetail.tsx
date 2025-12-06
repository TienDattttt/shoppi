import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userService } from "@/services/user.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Mail, Phone, Calendar, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function UserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadUser(id);
    }, [id]);

    const loadUser = async (userId: string) => {
        setLoading(true);
        try {
            const data = await userService.getUserById(userId);
            setUser(data);
        } catch (error) {
            toast.error("Failed to load user");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!user) return <div>User not found</div>;

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate("/admin/users")} className="gap-2 pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="h-4 w-4" /> Back to Users
            </Button>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Info */}
                <div className="w-full md:w-1/3 space-y-6">
                    <div className="bg-card rounded-xl border p-6 flex flex-col items-center text-center shadow-sm">
                        <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-bold">{user.username}</h2>
                        <span className="text-sm text-muted-foreground mb-4">{user.email}</span>
                        <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                            {user.status}
                        </Badge>

                        <div className="w-full mt-6 space-y-2">
                            <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
                                <Ban className="mr-2 h-4 w-4" /> Ban User
                            </Button>
                            <Button variant="outline" className="w-full">
                                <RotateCcw className="mr-2 h-4 w-4" /> Reset Password
                            </Button>
                        </div>
                    </div>

                    <div className="bg-card rounded-xl border p-6 space-y-4 shadow-sm">
                        <h3 className="font-semibold text-sm uppercase text-muted-foreground">Details</h3>
                        <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Role: <span className="font-medium capitalize">{user.role}</span></span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{user.phone}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Joined: {user.createdAt}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    <Tabs defaultValue="activity" className="w-full">
                        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                            <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Activity Log</TabsTrigger>
                            <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Orders History</TabsTrigger>
                        </TabsList>

                        <TabsContent value="activity" className="pt-6">
                            <div className="bg-card rounded-xl border p-6 shadow-sm min-h-[400px] flex items-center justify-center text-muted-foreground">
                                No recent activity found.
                            </div>
                        </TabsContent>
                        <TabsContent value="orders" className="pt-6">
                            <div className="bg-card rounded-xl border p-6 shadow-sm min-h-[400px] flex items-center justify-center text-muted-foreground">
                                No orders found.
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
