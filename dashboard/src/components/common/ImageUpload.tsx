import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
    value?: string | string[];
    onChange: (value: string | string[]) => void;
    disabled?: boolean;
    maxFiles?: number;
    className?: string;
}

export function ImageUpload({
    value,
    onChange,
    disabled,
    maxFiles = 1,
    className
}: ImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Normalize value to array
    const fileList = Array.isArray(value) ? value : (value ? [value] : []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        processFiles(Array.from(files));
    };

    const processFiles = (files: File[]) => {
        if (disabled) return;

        const remainingSlots = maxFiles - fileList.length;
        if (remainingSlots <= 0) {
            toast.error(`You can only upload up to ${maxFiles} images`);
            return;
        }

        const filesToProcess = files.slice(0, remainingSlots);

        // In a real app, we would upload to a server/cloud here.
        // For this demo, we'll create object URLs.
        const newUrls = filesToProcess.map(file => URL.createObjectURL(file));

        if (maxFiles === 1) {
            onChange(newUrls[0]);
        } else {
            onChange([...fileList, ...newUrls]);
        }
    };

    const handleRemove = (urlToRemove: string) => {
        if (disabled) return;
        if (maxFiles === 1) {
            onChange("");
        } else {
            onChange(fileList.filter(url => url !== urlToRemove));
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    return (
        <div className={cn("space-y-4", className)}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {fileList.map((url, index) => (
                    <div key={index} className="relative aspect-square group rounded-xl overflow-hidden border border-border">
                        <img
                            src={url}
                            alt="Upload"
                            className="object-cover w-full h-full"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => handleRemove(url)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {fileList.length < maxFiles && (
                    <div
                        className={cn(
                            "aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all",
                            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary hover:text-primary hover:bg-primary/5",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                            <ImageIcon className="h-8 w-8 mb-2" />
                            <span className="text-xs font-medium">Click or Drag Image</span>
                        </div>
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple={maxFiles > 1}
                onChange={handleFileChange}
                disabled={disabled}
            />
        </div>
    );
}
