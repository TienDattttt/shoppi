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

interface RequestRevisionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (changes: string) => Promise<void>;
    shopName: string;
}

export function RequestRevisionDialog({ open, onOpenChange, onConfirm, shopName }: RequestRevisionDialogProps) {
    const [changes, setChanges] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!changes.trim()) return;
        setLoading(true);
        try {
            await onConfirm(changes);
            onOpenChange(false);
            setChanges("");
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
                    <DialogTitle>Request Revision for {shopName}</DialogTitle>
                    <DialogDescription>
                        Specify what changes the partner needs to make. The shop status will be set to 'Revision Required'.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="changes">Required Changes</Label>
                        <Textarea
                            id="changes"
                            placeholder="e.g. Please update your logo to higher resolution, Address is incorrect..."
                            value={changes}
                            onChange={(e) => setChanges(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!changes.trim() || loading}>
                        {loading ? "Sending..." : "Send Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
