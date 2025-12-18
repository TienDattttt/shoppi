import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Package,
    Loader2,
    Upload,
    X,
    RotateCcw,
    AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { orderService, type Order } from "@/services/order.service";
import { returnService } from "@/services/return.service";
import { toast } from "sonner";
import api from "@/services/api";

interface ReturnReason {
    value: string;
    label: string;
    requiresEvidence: boolean;
}

const RETURN_REASONS: ReturnReason[] = [
    { value: "not_received", label: "Chưa nhận được hàng", requiresEvidence: false },
    { value: "damaged", label: "Hàng bị hư hỏng/vỡ", requiresEvidence: true },
    { value: "wrong_item", label: "Giao sai sản phẩm", requiresEvidence: true },
    { value: "not_as_described", label: "Không đúng mô tả/hình ảnh", requiresEvidence: true },
    { value: "defective", label: "Sản phẩm lỗi/không hoạt động", requiresEvidence: true },
    { value: "fake_product", label: "Hàng giả/nhái", requiresEvidence: true },
    { value: "missing_parts", label: "Thiếu phụ kiện/quà tặng", requiresEvidence: true },
    { value: "wrong_quantity", label: "Sai số lượng", requiresEvidence: true },
    { value: "change_mind", label: "Đổi ý (không muốn mua nữa)", requiresEvidence: false },
    { value: "other", label: "Lý do khác", requiresEvidence: false },
];

export default function ReturnRequestPage() {
    const { orderId, subOrderId } = useParams();
    const navigate = useNavigate();
    
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Form state
    const [reason, setReason] = useState("");
    const [reasonDetail, setReasonDetail] = useState("");
    const [requestType, setRequestType] = useState("return");
    const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (orderId) {
            fetchOrder();
        }
    }, [orderId]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Check max files
        if (evidenceUrls.length + files.length > 5) {
            toast.error("Tối đa 5 ảnh");
            return;
        }

        // Validate file types and sizes
        const validFiles: File[] = [];
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                toast.error(`${file.name}: Chỉ chấp nhận ảnh hoặc video`);
                continue;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name}: Kích thước tối đa 5MB`);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        setUploading(true);
        try {
            const response = await returnService.uploadEvidence(validFiles);
            setEvidenceUrls(prev => [...prev, ...response.urls]);
            toast.success(`Đã tải lên ${response.urls.length} ảnh`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể tải ảnh lên");
        } finally {
            setUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const data = await orderService.getOrderById(orderId!);
            setOrder(data);
        } catch (error) {
            console.error("Failed to fetch order:", error);
            toast.error("Không thể tải thông tin đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    const selectedReason = RETURN_REASONS.find(r => r.value === reason);
    const requiresEvidence = selectedReason?.requiresEvidence || false;

    const handleSubmit = async () => {
        if (!reason) {
            toast.error("Vui lòng chọn lý do trả hàng");
            return;
        }

        if (!subOrderId) {
            toast.error("Không tìm thấy thông tin đơn hàng");
            return;
        }

        // Validate evidence for certain reasons
        if (requiresEvidence && evidenceUrls.length === 0) {
            toast.error("Vui lòng cung cấp hình ảnh/video minh chứng cho lý do này");
            return;
        }

        setSubmitting(true);
        try {
            await api.post("/returns", {
                subOrderId,
                reason,
                reasonDetail,
                requestType,
                evidenceUrls,
            });
            
            toast.success("Yêu cầu trả hàng đã được gửi");
            navigate("/user/returns");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể gửi yêu cầu");
        } finally {
            setSubmitting(false);
        }
    };

    // Get the specific sub-order
    const subOrder = order?.subOrders?.find(so => so.id === subOrderId);
    const items = subOrder?.items || [];

    // Calculate refund amount
    const refundAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
            </div>
        );
    }

    if (!order || !subOrder) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h2 className="text-lg font-medium mb-2">Không tìm thấy đơn hàng</h2>
                <Button onClick={() => navigate("/user/purchase")}>Quay lại</Button>
            </div>
        );
    }

    // Check if can request return
    const canRequestReturn = ["delivered", "completed"].includes(subOrder.status);
    const hasExistingReturn = subOrder.status === "return_requested" || 
                              subOrder.status === "return_approved" ||
                              subOrder.status === "returned";

    if (!canRequestReturn || hasExistingReturn) {
        return (
            <div className="space-y-6">
                <div className="bg-white p-4 rounded-sm shadow-sm">
                    <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Quay lại
                    </Button>
                </div>
                <div className="bg-white p-12 rounded-sm shadow-sm text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                    <h2 className="text-lg font-medium mb-2">
                        {hasExistingReturn 
                            ? "Đơn hàng này đã có yêu cầu trả hàng" 
                            : "Không thể yêu cầu trả hàng cho đơn này"}
                    </h2>
                    <p className="text-gray-500 mb-6">
                        {hasExistingReturn
                            ? "Vui lòng kiểm tra trạng thái yêu cầu trả hàng của bạn"
                            : "Chỉ có thể yêu cầu trả hàng cho đơn đã giao thành công"}
                    </p>
                    <Link to="/user/returns">
                        <Button>Xem yêu cầu trả hàng</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-4 rounded-sm shadow-sm flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Quay lại
                </Button>
                <h1 className="text-lg font-medium">Yêu cầu Trả hàng / Hoàn tiền</h1>
                <div />
            </div>

            {/* Order Info */}
            <div className="bg-white p-6 rounded-sm shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5 text-shopee-orange" />
                    <span className="font-medium">Đơn hàng #{order.orderNumber}</span>
                </div>

                {/* Items */}
                <div className="divide-y">
                    {items.map(item => (
                        <div key={item.id} className="py-4 flex items-center gap-4">
                            <img
                                src={item.imageUrl || "https://placehold.co/80x80?text=Product"}
                                alt={item.productName}
                                className="h-16 w-16 object-cover rounded border"
                            />
                            <div className="flex-1">
                                <div className="font-medium text-sm">{item.productName}</div>
                                {item.variantName && (
                                    <div className="text-xs text-gray-500">{item.variantName}</div>
                                )}
                                <div className="text-xs text-gray-500">x{item.quantity}</div>
                            </div>
                            <div className="text-shopee-orange font-medium">
                                {formatCurrency(item.totalPrice)}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t pt-4 mt-4 flex justify-between items-center">
                    <span className="text-gray-500">Số tiền hoàn trả dự kiến:</span>
                    <span className="text-xl font-bold text-shopee-orange">
                        {formatCurrency(refundAmount)}
                    </span>
                </div>
            </div>

            {/* Return Form */}
            <div className="bg-white p-6 rounded-sm shadow-sm space-y-6">
                <h2 className="font-medium text-lg flex items-center gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Thông tin yêu cầu
                </h2>

                {/* Request Type */}
                <div className="space-y-2">
                    <Label>Loại yêu cầu</Label>
                    <Select value={requestType} onValueChange={setRequestType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="return">Trả hàng & Hoàn tiền</SelectItem>
                            <SelectItem value="refund_only">Chỉ hoàn tiền (không trả hàng)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                    <Label>Lý do *</Label>
                    <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger>
                            <SelectValue placeholder="Chọn lý do" />
                        </SelectTrigger>
                        <SelectContent>
                            {RETURN_REASONS.map(r => (
                                <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Reason Detail */}
                <div className="space-y-2">
                    <Label>Mô tả chi tiết</Label>
                    <Textarea
                        value={reasonDetail}
                        onChange={(e) => setReasonDetail(e.target.value)}
                        placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                        rows={4}
                    />
                </div>

                {/* Evidence Upload */}
                <div className="space-y-2">
                    <Label>
                        Hình ảnh/Video minh chứng
                        {requiresEvidence && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {requiresEvidence && (
                        <p className="text-sm text-orange-600">
                            Lý do này yêu cầu bắt buộc phải có hình ảnh minh chứng
                        </p>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <div 
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-shopee-orange transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploading ? (
                            <Loader2 className="h-8 w-8 mx-auto text-shopee-orange animate-spin mb-2" />
                        ) : (
                            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        )}
                        <p className="text-sm text-gray-500">
                            {uploading ? "Đang tải lên..." : "Click để chọn ảnh/video"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Tối đa 5 ảnh, mỗi ảnh không quá 5MB
                        </p>
                    </div>
                    {evidenceUrls.length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-2">
                            {evidenceUrls.map((url, idx) => (
                                <div key={idx} className="relative group">
                                    <img 
                                        src={url} 
                                        alt="" 
                                        className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                        onClick={() => window.open(url, '_blank')}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEvidenceUrls(prev => prev.filter((_, i) => i !== idx));
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Note */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                    <p className="font-medium text-yellow-800 mb-2">Lưu ý:</p>
                    <ul className="list-disc list-inside text-yellow-700 space-y-1">
                        <li>Shop sẽ phản hồi yêu cầu trong vòng 3 ngày</li>
                        <li>Nếu được duyệt, bạn cần gửi trả hàng trong 7 ngày</li>
                        <li>Tiền sẽ được hoàn sau khi shop nhận được hàng trả</li>
                    </ul>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || uploading || !reason}
                        className="bg-shopee-orange hover:bg-shopee-orange/90"
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Gửi yêu cầu
                    </Button>
                </div>
            </div>
        </div>
    );
}
