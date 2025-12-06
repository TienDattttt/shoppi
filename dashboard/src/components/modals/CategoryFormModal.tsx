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
    const [formData, setFormData] = useState<Partial<Category>>({
        name: "",
        slug: "",
        parentId: "none",
        displayOrder: 0,
        status: "active"
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name,
                    slug: initialData.slug,
                    parentId: initialData.parentId || "none",
                    displayOrder: initialData.displayOrder,
                    status: initialData.status
                });
            } else {
                setFormData({
                    name: "",
                    slug: "",
                    parentId: "none",
                    displayOrder: 0,
                    status: "active"
                });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitData = { ...formData };
        if (submitData.parentId === "none") delete submitData.parentId;
        onSubmit(submitData);
        onClose();
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
                        value={formData.parentId}
                        onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select parent" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None (Root Category)</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="order">Display Order</Label>
                        <Input
                            id="order"
                            type="number"
                            value={formData.displayOrder}
                            onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value: any) => setFormData({ ...formData, status: value })}
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
