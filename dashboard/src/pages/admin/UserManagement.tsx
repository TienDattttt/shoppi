
import { useEffect, useState } from "react";
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
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getAllUsers({});
            setUsers(data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        setUsers(users.map(u => u._id === id ? { ...u, status: newStatus as any } : u));
    };

    const columns = [
        {
            header: "User",
            className: "w-[250px]",
            cell: (user: User) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border/50">
                        <AvatarImage src={`https://avatar.vercel.sh/${user.username}.png`} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                            {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">{user.username}</span>
                        <span className="text-xs text-muted-foreground sm:hidden">{user.email}</span>
                    </div>
                </div>
            )
        },
        {
            header: "Email",
            accessorKey: "email" as keyof User,
            className: "hidden sm:table-cell"
        },
        {
            header: "Role",
            cell: (user: User) => (
                <Badge
                    variant="outline"
                    className={
                        user.role === 'shop'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                    }
                >
                    {user.role === 'shop' ? 'Shop' : 'User'}
                </Badge>
            )
        },
        {
            header: "Status",
            cell: (user: User) => (
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active'
                    ? 'bg-green-100/50 text-green-700'
                    : 'bg-red-100/50 text-red-700'
                    }`}>
                    {user.status === 'active' ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                        <Ban className="w-3 h-3 mr-1" />
                    )}
                    {user.status === 'active' ? 'Active' : 'Banned'}
                </div>
            )
        },
        {
            header: "Joined",
            accessorKey: "createdAt" as keyof User,
            className: "hidden md:table-cell text-muted-foreground font-mono text-xs"
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (user: User) => (
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
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user._id)}>
                                Copy ID
                            </DropdownMenuItem>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.status === 'active' ? (
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleStatusChange(user._id, 'banned')}>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Ban Account
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem className="text-green-600 focus:text-green-600" onClick={() => handleStatusChange(user._id, 'active')}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Activate Account
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
