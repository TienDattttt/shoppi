
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "@/services/user.service";
import type { User } from "@/services/user.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Ban, CheckCircle } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTable } from "@/components/common/DataTable";

export default function UserManagement() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getAllUsers({});
            // API returns { users: [...], pagination: {...} }
            setUsers(data.users || data.data?.users || data || []);
        } catch (error) {
            console.error(error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await userService.updateUser(id, { status: newStatus });
            setUsers(users.map((u: any) => u.id === id ? { ...u, status: newStatus } : u));
        } catch (error) {
            console.error('Failed to update user status:', error);
        }
    };

    const columns = [
        {
            header: "User",
            className: "w-[250px]",
            cell: (user: any) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border/50">
                        <AvatarImage src={user.avatar_url || `https://avatar.vercel.sh/${user.full_name || user.email}.png`} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                            {(user.full_name || user.email || 'U').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">{user.full_name || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                </div>
            )
        },
        {
            header: "Phone",
            cell: (user: any) => <span className="text-sm">{user.phone || '-'}</span>,
            className: "hidden sm:table-cell"
        },
        {
            header: "Role",
            cell: (user: any) => {
                const roleColors: Record<string, string> = {
                    admin: 'bg-red-50 text-red-700 border-red-200',
                    partner: 'bg-purple-50 text-purple-700 border-purple-200',
                    customer: 'bg-blue-50 text-blue-700 border-blue-200',
                    shipper: 'bg-orange-50 text-orange-700 border-orange-200',
                };
                return (
                    <Badge variant="outline" className={roleColors[user.role] || 'bg-gray-50'}>
                        {user.role}
                    </Badge>
                );
            }
        },
        {
            header: "Status",
            cell: (user: any) => (
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active'
                    ? 'bg-green-100/50 text-green-700'
                    : user.status === 'pending'
                    ? 'bg-yellow-100/50 text-yellow-700'
                    : 'bg-red-100/50 text-red-700'
                    }`}>
                    {user.status === 'active' ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                        <Ban className="w-3 h-3 mr-1" />
                    )}
                    {user.status}
                </div>
            )
        },
        {
            header: "Joined",
            cell: (user: any) => (
                <span className="text-muted-foreground font-mono text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                </span>
            ),
            className: "hidden md:table-cell"
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (user: any) => (
                <div className="flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="shadow-premium border-border/50">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                                Copy ID
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/users/${user.id}`)}>
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.status === 'active' ? (
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleStatusChange(user.id, 'inactive')}>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Deactivate
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem className="text-green-600 focus:text-green-600" onClick={() => handleStatusChange(user.id, 'active')}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Activate
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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
                    <p className="text-muted-foreground mt-1">Manage system users and permissions</p>
                </div>
                <Button className="shadow-lg hover:shadow-xl transition-all">
                    Add User
                </Button>
            </div>

            <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                <DataTable
                    data={users}
                    columns={columns}
                    searchKey="email"
                    searchPlaceholder="Search by email..."
                    isLoading={loading}
                />
            </div>
        </div>
    );
}
