import { useState, useEffect } from "react";
import { FormModal } from "@/components/common/FormModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category } from "@/services/category.service";

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Category>) => void;
    initialData?: Category | null;
    categories: Category[]; // To select parent
}

export function CategoryFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    categories
}: CategoryFormModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        parent_id: "none",
        sort_order: 0,
        is_active: true
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const data = initialData as any;
                setFormData({
                    name: data.name || "",
                    slug: data.slug || "",
                    parent_id: data.parent_id || "none",
                    sort_order: data.sort_order || 0,
                    is_active: data.is_active !== false
                });
            } else {
                setFormData({
                    name: "",
                    slug: "",
                    parent_id: "none",
                    sort_order: 0,
                    is_active: true
                });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitData: any = { 
            name: formData.name,
            slug: formData.slug,
            sort_order: formData.sort_order,
            is_active: formData.is_active
        };
        if (formData.parent_id !== "none") {
            submitData.parent_id = formData.parent_id;
        }
        onSubmit(submitData);
    };

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Edit Category" : "Add New Category"}
            description={initialData ? "Update category details" : "Create a new product category"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Category Name</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="parent">Parent Category</Label>
                    <Select
                        value={formData.parent_id}
                        onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select parent" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None (Root Category)</SelectItem>
                            {categories
                                .filter((cat: any) => {
                                    // Exclude current category (can't be its own parent)
                                    const catId = cat.id || cat._id;
                                    const editId = initialData ? ((initialData as any).id || (initialData as any)._id) : null;
                                    return catId !== editId;
                                })
                                .map((cat: any) => (
                                    <SelectItem key={cat.id || cat._id} value={cat.id || cat._id}>
                                        {cat.parent_id ? `└─ ${cat.name}` : cat.name}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="order">Sort Order</Label>
                        <Input
                            id="order"
                            type="number"
                            value={formData.sort_order}
                            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={formData.is_active ? "active" : "inactive"}
                            onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit">{initialData ? "Update" : "Create"}</Button>
                </div>
            </form>
        </FormModal>
    );
}
