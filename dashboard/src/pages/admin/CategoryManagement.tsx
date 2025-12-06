import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Folder, ChevronRight, MoreVertical, Edit, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categoryService, type Category } from "@/services/category.service";
import { CategoryFormModal } from "@/components/modals/CategoryFormModal";
import { toast } from "sonner";

import { ConfirmModal } from "@/components/common/ConfirmModal";

export default function CategoryManagement() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await categoryService.getAllCategories();
            setCategories(data);
        } catch (error) {
            toast.error("Failed to load categories");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingCategory(null);
        setIsModalOpen(true);
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this category?")) {
            try {
                await categoryService.deleteCategory(id);
                toast.success("Category deleted");
                loadCategories();
            } catch (error) {
                toast.error("Failed to delete category");
            }
        }
    };

    const handleSubmit = async (data: Partial<Category>) => {
        try {
            if (editingCategory) {
                await categoryService.updateCategory(editingCategory._id, data);
                toast.success("Category updated");
            } else {
                await categoryService.createCategory(data);
                toast.success("Category created");
            }
            loadCategories();
        } catch (error) {
            toast.error(editingCategory ? "Failed to update" : "Failed to create");
        }
    };

    if (loading) return <div>Loading...</div>;

    // Flatten for parent selection in modal, but keep tree for display
    const flatCategories = categories;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Category Management</h1>
                    <p className="text-muted-foreground mt-1">Configure product category tree</p>
                </div>
                <Button className="shadow-lg" onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-premium border-border/50">
                    <CardHeader>
                        <CardTitle>Category Tree</CardTitle>
                        <CardDescription>Drag and drop to reorder (Coming Soon)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {categories.map((cat) => (
                                <div key={cat._id} className="space-y-1">
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <Folder className="h-5 w-5 text-blue-500" />
                                            <span className="font-medium">{cat.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cat)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cat._id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    {/* Children */}
                                    {cat.children && cat.children.length > 0 && (
                                        <div className="ml-6 space-y-1 border-l-2 border-muted pl-4">
                                            {cat.children.map((child) => (
                                                <div key={child._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">{child.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3 w-3" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleEdit(child)}>Edit</DropdownMenuItem>
                                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(child._id)}>Delete</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats or Add Form could go here */}
                <Card className="shadow-premium border-border/50 h-fit">
                    <CardHeader>
                        <CardTitle>Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b">
                            <span className="text-muted-foreground">Total Parent Categories</span>
                            <span className="font-bold">{categories.length}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b">
                            <span className="text-muted-foreground">Total Sub Categories</span>
                            <span className="font-bold">{categories.reduce((acc, cat) => acc + (cat.children?.length || 0), 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Active Status</span>
                            <span className="font-bold text-green-600">100%</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <CategoryFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingCategory}
                categories={flatCategories}
            />
        </div>
    );
}
