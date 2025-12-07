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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RejectShopDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (reason: string) => Promise<void>;
    shopName: string;
}

export function RejectShopDialog({ open, onOpenChange, onConfirm, shopName }: RejectShopDialogProps) {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) return;
        setLoading(true);
        try {
            await onConfirm(reason);
            onOpenChange(false);
            setReason("");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reject Shop: {shopName}</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to reject this shop? This action cannot be undone immediately.
                        Please provide a reason for the rejection.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Rejection Reason</Label>
                        <Textarea
                            id="reason"
                            placeholder="e.g. Invalid business license, Copyright infringement..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleSubmit} disabled={!reason.trim() || loading}>
                        {loading ? "Rejecting..." : "Reject Shop"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
