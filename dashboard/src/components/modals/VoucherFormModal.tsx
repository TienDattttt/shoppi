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
    onSubmit: (data: Record<string, unknown>) => void;
    initialData?: Voucher | null;
}

export function VoucherFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData
}: VoucherFormModalProps) {
    const [formData, setFormData] = useState({
        code: "",
        discount_type: "fixed" as "fixed" | "percent",
        discount_value: 0,
        min_order_value: 0,
        max_discount_value: 0,
        usage_limit: 100,
        usage_per_user: 1,
        start_date: "",
        end_date: "",
        is_active: true
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Map 'percentage' from DB to 'percent' for frontend
                const dbType = initialData.discount_type as string;
                const discountType = dbType === 'percentage' ? 'percent' : (dbType || 'fixed');
                setFormData({
                    code: initialData.code || "",
                    discount_type: discountType as "fixed" | "percent",
                    discount_value: initialData.discount_value || 0,
                    min_order_value: initialData.min_order_value || 0,
                    max_discount_value: (initialData as any).max_discount || initialData.max_discount_value || 0,
                    usage_limit: initialData.usage_limit || 100,
                    usage_per_user: (initialData as any).per_user_limit || initialData.usage_per_user || 1,
                    start_date: initialData.start_date ? initialData.start_date.split('T')[0] : "",
                    end_date: initialData.end_date ? initialData.end_date.split('T')[0] : "",
                    is_active: initialData.is_active !== false
                });
            } else {
                setFormData({
                    code: "",
                    discount_type: "fixed",
                    discount_value: 0,
                    min_order_value: 0,
                    max_discount_value: 0,
                    usage_limit: 100,
                    usage_per_user: 1,
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: "",
                    is_active: true
                });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Chỉnh Sửa Voucher" : "Tạo Voucher Mới"}
            description={initialData ? "Cập nhật thông tin voucher" : "Tạo mã giảm giá mới cho shop"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="code">Mã Voucher *</Label>
                    <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="VD: SUMMER50"
                        required
                        disabled={!!initialData} // Can't change code when editing
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">Loại Giảm Giá *</Label>
                        <Select
                            value={formData.discount_type}
                            onValueChange={(value: "fixed" | "percent") => setFormData({ ...formData, discount_type: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fixed">Số tiền cố định (VND)</SelectItem>
                                <SelectItem value="percent">Phần trăm (%)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="value">Giá Trị Giảm *</Label>
                        <Input
                            id="value"
                            type="number"
                            value={formData.discount_value}
                            onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) || 0 })}
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="minOrder">Đơn Tối Thiểu (VND)</Label>
                        <Input
                            id="minOrder"
                            type="number"
                            value={formData.min_order_value}
                            onChange={(e) => setFormData({ ...formData, min_order_value: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="maxDiscount">Giảm Tối Đa (VND)</Label>
                        <Input
                            id="maxDiscount"
                            type="number"
                            value={formData.max_discount_value}
                            onChange={(e) => setFormData({ ...formData, max_discount_value: parseInt(e.target.value) || 0 })}
                            placeholder="Chỉ áp dụng cho %"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="usageLimit">Giới Hạn Sử Dụng</Label>
                        <Input
                            id="usageLimit"
                            type="number"
                            value={formData.usage_limit}
                            onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="perUser">Mỗi Người Dùng</Label>
                        <Input
                            id="perUser"
                            type="number"
                            value={formData.usage_per_user}
                            onChange={(e) => setFormData({ ...formData, usage_per_user: parseInt(e.target.value) || 1 })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="startDate">Ngày Bắt Đầu *</Label>
                        <Input
                            id="startDate"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="endDate">Ngày Kết Thúc *</Label>
                        <Input
                            id="endDate"
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
                    <Button type="submit">{initialData ? "Cập Nhật" : "Tạo Voucher"}</Button>
                </div>
            </form>
        </FormModal>
    );
}
