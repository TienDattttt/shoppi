import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface OperatingHours {
    [day: string]: { open: string; close: string; isOpen: boolean };
}

interface OperatingHoursEditorProps {
    value?: OperatingHours;
    onChange: (value: OperatingHours) => void;
}

const DAYS = [
    { key: "monday", label: "Thứ Hai" },
    { key: "tuesday", label: "Thứ Ba" },
    { key: "wednesday", label: "Thứ Tư" },
    { key: "thursday", label: "Thứ Năm" },
    { key: "friday", label: "Thứ Sáu" },
    { key: "saturday", label: "Thứ Bảy" },
    { key: "sunday", label: "Chủ Nhật" },
];

const DEFAULT_HOURS = { open: "08:00", close: "22:00", isOpen: true };

export function OperatingHoursEditor({ value, onChange }: OperatingHoursEditorProps) {
    // Initialize with default values if empty
    const [hours, setHours] = useState<OperatingHours>(() => {
        if (value && Object.keys(value).length > 0) return value;
        const initial: OperatingHours = {};
        DAYS.forEach(day => {
            initial[day.key] = { ...DEFAULT_HOURS };
        });
        return initial;
    });

    const handleChange = (dayKey: string, field: string, val: string | boolean) => {
        const newHours = {
            ...hours,
            [dayKey]: {
                ...hours[dayKey],
                [field]: val
            }
        };
        setHours(newHours);
        onChange(newHours);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-[100px_1fr_1fr_60px] gap-4 mb-2 font-medium text-sm text-muted-foreground">
                <div>Ngày</div>
                <div>Giờ mở cửa</div>
                <div>Giờ đóng cửa</div>
                <div className="text-center">Mở</div>
            </div>
            {DAYS.map((day) => (
                <div key={day.key} className="grid grid-cols-[100px_1fr_1fr_60px] gap-4 items-center">
                    <Label className={!hours[day.key]?.isOpen ? "text-muted-foreground" : ""}>
                        {day.label}
                    </Label>
                    <Input
                        type="time"
                        value={hours[day.key]?.open || "08:00"}
                        onChange={(e) => handleChange(day.key, "open", e.target.value)}
                        disabled={!hours[day.key]?.isOpen}
                        className="h-8"
                    />
                    <Input
                        type="time"
                        value={hours[day.key]?.close || "22:00"}
                        onChange={(e) => handleChange(day.key, "close", e.target.value)}
                        disabled={!hours[day.key]?.isOpen}
                        className="h-8"
                    />
                    <div className="flex justify-center">
                        <Switch
                            checked={hours[day.key]?.isOpen}
                            onCheckedChange={(checked) => handleChange(day.key, "isOpen", checked)}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
