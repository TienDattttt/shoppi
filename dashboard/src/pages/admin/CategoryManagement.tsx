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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { categoryService, type Category } from "@/services/category.service";
import { CategoryFormModal } from "@/components/modals/CategoryFormModal";
import { toast } from "sonner";

export default function CategoryManagement() {
    const [categories, setCategories] = useState<Category[]>([]); // Tree structure for display
    const [flatCategories, setFlatCategories] = useState<Category[]>([]); // Flat list for modal dropdown
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        try {
            // Load both tree and flat list
            const [treeData, flatData] = await Promise.all([
                categoryService.getAllCategories(),
                categoryService.getFlatCategories()
            ]);
            setCategories(treeData);
            setFlatCategories(flatData);
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

    const handleDeleteClick = (id: string) => {
        setCategoryToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!categoryToDelete) return;
        try {
            await categoryService.deleteCategory(categoryToDelete);
            toast.success("Category deleted successfully");
            loadCategories();
        } catch (error: any) {
            const message = error.response?.data?.error?.message || "Failed to delete category";
            toast.error(message);
        } finally {
            setDeleteDialogOpen(false);
            setCategoryToDelete(null);
        }
    };

    const handleSubmit = async (data: Partial<Category>) => {
        try {
            if (editingCategory) {
                const catId = (editingCategory as any).id || (editingCategory as any)._id;
                await categoryService.updateCategory(catId, data);
                toast.success("Category updated");
            } else {
                await categoryService.createCategory(data);
                toast.success("Category created");
            }
            setIsModalOpen(false);
            loadCategories();
        } catch (error) {
            toast.error(editingCategory ? "Failed to update" : "Failed to create");
        }
    };

    if (loading) return <div>Loading...</div>;

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
                            {categories.map((cat: any) => (
                                <div key={cat.id || cat._id} className="space-y-1">
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <Folder className="h-5 w-5 text-blue-500" />
                                            <span className="font-medium">{cat.name}</span>
                                            {!cat.is_active && <span className="text-xs text-muted-foreground">(inactive)</span>}
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cat)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteClick(cat.id || cat._id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    {/* Children */}
                                    {cat.children && cat.children.length > 0 && (
                                        <div className="ml-6 space-y-1 border-l-2 border-muted pl-4">
                                            {cat.children.map((child: any) => (
                                                <div key={child.id || child._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group">
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
                                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(child.id || child._id)}>Delete</DropdownMenuItem>
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

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this category? This action cannot be undone.
                            If this category has sub-categories, they will become root categories.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
