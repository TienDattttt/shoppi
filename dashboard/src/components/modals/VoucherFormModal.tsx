import { useState, useEffect } from "react";
import { FormModal } from "@/components/common/FormModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Voucher } from "@/services/voucher.service";

interface VoucherFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Voucher>) => void;
    initialData?: Voucher | null;
}

export function VoucherFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData
}: VoucherFormModalProps) {
    const [formData, setFormData] = useState<Partial<Voucher>>({
        code: "",
        discountType: "fixed",
        value: 0,
        minOrderValue: 0,
        usageLimit: 100,
        startDate: "",
        endDate: "",
        status: "active"
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    code: initialData.code,
                    discountType: initialData.discountType,
                    value: initialData.value,
                    minOrderValue: initialData.minOrderValue,
                    usageLimit: initialData.usageLimit,
                    startDate: initialData.startDate,
                    endDate: initialData.endDate,
                    status: initialData.status
                });
            } else {
                setFormData({
                    code: "",
                    discountType: "fixed",
                    value: 0,
                    minOrderValue: 0,
                    usageLimit: 100,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: "",
                    status: "active"
                });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Edit Voucher" : "Create Voucher"}
            description={initialData ? "Update voucher details" : "Create a new discount code"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="code">Voucher Code</Label>
                    <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., SUMMER50"
                        required
                    />
                </div>

                <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="type">Discount Type</Label>
                        <Select
                            value={formData.discountType}
                            onValueChange={(value: any) => setFormData({ ...formData, discountType: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fixed">Fixed Amount (VND)</SelectItem>
                                <SelectItem value="percent">Percentage (%)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="value">Discount Value</Label>
                        <Input
                            id="value"
                            type="number"
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) })}
                            required
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="minOrder">Min Order Value</Label>
                        <Input
                            id="minOrder"
                            type="number"
                            value={formData.minOrderValue}
                            onChange={(e) => setFormData({ ...formData, minOrderValue: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="usageLimit">Usage Limit</Label>
                        <Input
                            id="usageLimit"
                            type="number"
                            value={formData.usageLimit}
                            onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                            id="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            required
                        />
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
