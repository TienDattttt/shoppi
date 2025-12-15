/**
 * PickupRequestModal Component
 * Modal for requesting pickup with time slot selection and notes
 * 
 * Requirements: 2.6
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Clock, Truck, MapPin } from "lucide-react";
import dayjs from "dayjs";

// Time slot options
const TIME_SLOTS = [
    { value: "08:00-10:00", label: "08:00 - 10:00", period: "Sáng sớm" },
    { value: "10:00-12:00", label: "10:00 - 12:00", period: "Buổi sáng" },
    { value: "14:00-16:00", label: "14:00 - 16:00", period: "Buổi chiều" },
    { value: "16:00-18:00", label: "16:00 - 18:00", period: "Chiều tối" },
];

// Get available time slots based on current time
function getAvailableTimeSlots() {
    const now = dayjs();
    const currentHour = now.hour();
    
    // If it's after 16:00, all slots are for tomorrow
    if (currentHour >= 16) {
        return TIME_SLOTS.map(slot => ({
            ...slot,
            date: "tomorrow",
            dateLabel: `Ngày mai (${now.add(1, "day").format("DD/MM")})`,
        }));
    }
    
    // Filter slots that are still available today
    const todaySlots = TIME_SLOTS.filter(slot => {
        const [startHour] = slot.value.split("-")[0].split(":").map(Number);
        return startHour > currentHour + 1; // Need at least 1 hour buffer
    }).map(slot => ({
        ...slot,
        date: "today",
        dateLabel: `Hôm nay (${now.format("DD/MM")})`,
    }));
    
    // Add tomorrow slots
    const tomorrowSlots = TIME_SLOTS.map(slot => ({
        ...slot,
        date: "tomorrow",
        dateLabel: `Ngày mai (${now.add(1, "day").format("DD/MM")})`,
    }));
    
    return [...todaySlots, ...tomorrowSlots];
}


interface PickupRequestModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shipmentId: string;
    trackingNumber: string;
    shopAddress: string;
    onConfirm: (data: { preferredTime: string; notes?: string }) => Promise<void>;
}

export function PickupRequestModal({
    open,
    onOpenChange,
    trackingNumber,
    shopAddress,
    onConfirm,
}: PickupRequestModalProps) {
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableSlots = getAvailableTimeSlots();

    // Group slots by date
    const groupedSlots = availableSlots.reduce((acc, slot) => {
        const key = slot.dateLabel;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(slot);
        return acc;
    }, {} as Record<string, typeof availableSlots>);

    const handleSubmit = async () => {
        if (!selectedTimeSlot) return;

        setIsSubmitting(true);
        try {
            await onConfirm({
                preferredTime: selectedTimeSlot,
                notes: notes.trim() || undefined,
            });
            // Reset form
            setSelectedTimeSlot("");
            setNotes("");
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setSelectedTimeSlot("");
            setNotes("");
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-primary" />
                        Yêu cầu lấy hàng
                    </DialogTitle>
                    <DialogDescription>
                        Chọn khung giờ bạn muốn shipper đến lấy hàng
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Shipment Info */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Mã vận đơn:</span>
                            <span className="font-mono font-medium">{trackingNumber}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{shopAddress}</span>
                        </div>
                    </div>


                    {/* Time Slot Selection */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Chọn khung giờ lấy hàng
                        </Label>
                        
                        <RadioGroup
                            value={selectedTimeSlot}
                            onValueChange={setSelectedTimeSlot}
                            className="space-y-4"
                        >
                            {Object.entries(groupedSlots).map(([dateLabel, slots]) => (
                                <div key={dateLabel} className="space-y-2">
                                    <div className="text-sm font-medium text-muted-foreground">
                                        {dateLabel}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {slots.map((slot) => (
                                            <div key={`${slot.date}-${slot.value}`}>
                                                <RadioGroupItem
                                                    value={`${slot.date}-${slot.value}`}
                                                    id={`${slot.date}-${slot.value}`}
                                                    className="peer sr-only"
                                                />
                                                <Label
                                                    htmlFor={`${slot.date}-${slot.value}`}
                                                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-colors"
                                                >
                                                    <Clock className="h-4 w-4 mb-1 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{slot.label}</span>
                                                    <span className="text-xs text-muted-foreground">{slot.period}</span>
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Ghi chú cho shipper (tùy chọn)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Ví dụ: Gọi điện trước khi đến, hàng dễ vỡ..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            maxLength={500}
                        />
                        <div className="text-xs text-muted-foreground text-right">
                            {notes.length}/500
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedTimeSlot || isSubmitting}
                    >
                        {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
