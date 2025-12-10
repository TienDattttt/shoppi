import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadService } from "@/services/upload.service";

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
    const [uploading, setUploading] = useState(false);

    // Normalize value to array
    const fileList = Array.isArray(value) ? value : (value ? [value] : []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        processFiles(Array.from(files));
    };

    const processFiles = async (files: File[]) => {
        if (disabled || uploading) return;

        const remainingSlots = maxFiles - fileList.length;
        if (remainingSlots <= 0) {
            toast.error(`Bạn chỉ có thể tải lên tối đa ${maxFiles} ảnh`);
            return;
        }

        const filesToProcess = files.slice(0, remainingSlots);
        
        // Validate file sizes
        const maxSize = 5 * 1024 * 1024; // 5MB
        const oversizedFiles = filesToProcess.filter(f => f.size > maxSize);
        if (oversizedFiles.length > 0) {
            toast.error('Một số file vượt quá 5MB');
            return;
        }

        setUploading(true);
        try {
            // Upload to server
            const uploadedUrls = await uploadService.uploadProductImages(filesToProcess);
            
            if (uploadedUrls.length > 0) {
                if (maxFiles === 1) {
                    onChange(uploadedUrls[0]);
                } else {
                    onChange([...fileList, ...uploadedUrls]);
                }
                toast.success(`Đã tải lên ${uploadedUrls.length} ảnh`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Không thể tải ảnh lên. Vui lòng thử lại.');
        } finally {
            setUploading(false);
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
                            (disabled || uploading) && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                            {uploading ? (
                                <>
                                    <Loader2 className="h-8 w-8 mb-2 animate-spin" />
                                    <span className="text-xs font-medium">Đang tải lên...</span>
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="h-8 w-8 mb-2" />
                                    <span className="text-xs font-medium">Click hoặc kéo ảnh vào đây</span>
                                </>
                            )}
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
