import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userService } from "@/services/user.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Phone, Calendar, Ban, RotateCcw, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Session {
    id: string;
    device_type: string;
    device_name: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
    last_activity_at: string;
}

interface Order {
    id: string;
    order_number: string;
    total_amount: number;
    status: string;
    payment_status: string;
    created_at: string;
}

export default function UserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (id) {
            loadUser(id);
            loadSessions(id);
            loadOrders(id);
        }
    }, [id]);

    const loadUser = async (userId: string) => {
        setLoading(true);
        try {
            const data = await userService.getUserById(userId);
            setUser(data.user || data);
        } catch (error) {
            toast.error("Failed to load user");
        } finally {
            setLoading(false);
        }
    };

    const loadSessions = async (userId: string) => {
        setSessionsLoading(true);
        try {
            const data = await userService.getUserSessions(userId);
            setSessions(data.sessions || []);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        } finally {
            setSessionsLoading(false);
        }
    };

    const loadOrders = async (userId: string) => {
        setOrdersLoading(true);
        try {
            const data = await userService.getUserOrders(userId);
            setOrders(data.orders || []);
        } catch (error) {
            console.error("Failed to load orders:", error);
        } finally {
            setOrdersLoading(false);
        }
    };

    const handleBanUser = async () => {
        if (!id) return;
        setActionLoading(true);
        try {
            const newStatus = user.status === 'active' ? 'inactive' : 'active';
            await userService.updateUser(id, { status: newStatus });
            setUser({ ...user, status: newStatus });
            toast.success(newStatus === 'active' ? 'User activated!' : 'User banned!');
        } catch (error) {
            toast.error("Failed to update user status");
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetPassword = async () => {
        toast.info("Password reset email sent (mock)");
        // TODO: Implement actual password reset API
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>{(user.full_name || user.email || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-bold">{user.full_name || 'N/A'}</h2>
                        <span className="text-sm text-muted-foreground mb-4">{user.email}</span>
                        <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                            {user.status}
                        </Badge>

                        <div className="w-full mt-6 space-y-2">
                            <Button 
                                variant="outline" 
                                className={`w-full ${user.status === 'active' ? 'border-destructive text-destructive hover:bg-destructive/10' : 'border-green-500 text-green-600 hover:bg-green-50'}`}
                                onClick={handleBanUser}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : user.status === 'active' ? (
                                    <><Ban className="mr-2 h-4 w-4" /> Ban User</>
                                ) : (
                                    <><CheckCircle className="mr-2 h-4 w-4" /> Activate User</>
                                )}
                            </Button>
                            <Button variant="outline" className="w-full" onClick={handleResetPassword}>
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
                            <span className="text-sm">{user.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
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
                            <div className="bg-card rounded-xl border p-6 shadow-sm">
                                {sessionsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : sessions.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No activity found</p>
                                ) : (
                                    <div className="space-y-4">
                                        {sessions.map((session) => (
                                            <div key={session.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        Logged in from {session.device_name || session.device_type || 'Unknown device'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">IP: {session.ip_address || 'N/A'}</p>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(session.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="orders" className="pt-6">
                            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                                {ordersLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : orders.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No orders found</p>
                                ) : (
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-3 text-sm font-medium">Order ID</th>
                                                <th className="text-left p-3 text-sm font-medium">Date</th>
                                                <th className="text-left p-3 text-sm font-medium">Total</th>
                                                <th className="text-left p-3 text-sm font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map((order) => (
                                                <tr key={order.id} className="border-t hover:bg-muted/30">
                                                    <td className="p-3 text-sm font-mono">#{order.order_number || order.id.slice(0, 8)}</td>
                                                    <td className="p-3 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                                                    <td className="p-3 text-sm font-medium">{order.total_amount?.toLocaleString()}đ</td>
                                                    <td className="p-3">
                                                        <Badge variant={order.status === 'delivered' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                                            {order.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
