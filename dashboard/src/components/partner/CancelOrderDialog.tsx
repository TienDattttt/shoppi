import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface CancelOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (reason: string) => void;
    orderId: string;
}

export function CancelOrderDialog({ open, onOpenChange, onConfirm, orderId }: CancelOrderDialogProps) {
    const [reason, setReason] = useState("");

    const handleConfirm = () => {
        if (reason.trim()) {
            onConfirm(reason);
            setReason("");
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Cancel Order</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to cancel order #{orderId}? This action cannot be undone.
                        Please provide a reason for the cancellation.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Textarea
                        placeholder="Enter cancellation reason..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="min-h-[100px]"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim()}>
                        Cancel Order
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
