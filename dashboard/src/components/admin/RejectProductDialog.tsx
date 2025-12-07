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

interface RejectProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (reason: string) => void;
    productName: string;
}

export function RejectProductDialog({ open, onOpenChange, onConfirm, productName }: RejectProductDialogProps) {
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
                    <DialogTitle>Reject Product</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to reject "{productName}"? This action cannot be undone.
                        Please provide a reason for the rejection.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Textarea
                        placeholder="Enter rejection reason..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="min-h-[100px]"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim()}>
                        Reject Product
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
