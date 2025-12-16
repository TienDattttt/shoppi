import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Package } from "lucide-react";
import { shipperService } from "@/services/shipper.service";
import { toast } from "sonner";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";

interface ShippingLabelData {
    trackingNumber: string;
    barcodeData: string;
    orderNumber?: string;
    sender: {
        name: string;
        phone: string;
        address: string;
    };
    receiver: {
        name: string;
        phone: string;
        address: string;
    };
    package: {
        weight: number | null;
        dimensions: string | null;
        itemCount: number;
    };
    payment: {
        codAmount: number;
        shippingFee: number;
        isCod: boolean;
    };
    delivery: {
        estimatedDelivery: string | null;
        notes: string | null;
    };
    items?: Array<{
        name: string;
        variant?: string;
        quantity: number;
    }>;
    createdAt: string;
    orderId: string;
    subOrderId: string;
}

interface ShippingLabelModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shipmentId: string;
}

export function ShippingLabelModal({ open, onOpenChange, shipmentId }: ShippingLabelModalProps) {
    const [loading, setLoading] = useState(true);
    const [labelData, setLabelData] = useState<ShippingLabelData | null>(null);

    useEffect(() => {
        if (open && shipmentId) {
            loadLabelData();
        }
    }, [open, shipmentId]);

    const loadLabelData = async () => {
        setLoading(true);
        try {
            const response = await shipperService.getShippingLabel(shipmentId);
            setLabelData(response.data?.label || response.label);
        } catch (error) {
            console.error("Failed to load shipping label:", error);
            toast.error("Không thể tải phiếu giao hàng");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };
    };

    // Generate sort code from tracking number (e.g., HC-51-03-GV13)
    const generateSortCode = (tracking: string) => {
        const hash = tracking.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        const abs = Math.abs(hash);
        return `HC-${(abs % 99).toString().padStart(2, '0')}-${((abs >> 8) % 99).toString().padStart(2, '0')}-${tracking.slice(-4).toUpperCase()}`;
    };

    // Generate QR code data - contains shipment info for shipper app to scan
    const generateQRData = (data: ShippingLabelData) => {
        return JSON.stringify({
            t: data.trackingNumber, // tracking number
            o: data.orderId,        // order id
            s: data.subOrderId,     // sub order id
            c: data.payment.codAmount, // COD amount
        });
    };

    if (loading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-[500px]">
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!labelData) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-[500px]">
                    <div className="text-center py-12 text-muted-foreground">
                        Không thể tải thông tin phiếu giao hàng
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const dateInfo = formatDate(labelData.createdAt);
    const sortCode = generateSortCode(labelData.trackingNumber);
    const qrData = generateQRData(labelData);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[550px] max-h-[95vh] overflow-y-auto p-0">
                <DialogHeader className="p-4 pb-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Phiếu giao hàng
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Phiếu giao hàng với mã vận đơn và thông tin giao nhận
                    </DialogDescription>
                </DialogHeader>

                {/* Print Actions */}
                <div className="flex gap-2 px-4 print:hidden">
                    <Button onClick={handlePrint} size="sm" className="gap-2">
                        <Printer className="h-4 w-4" />
                        In phiếu
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Tải PDF
                    </Button>
                </div>

                {/* Shipping Label - Shopee Express Style */}
                <div className="p-4">
                    <div className="border-2 border-black bg-white text-black" id="shipping-label" style={{ fontFamily: 'Arial, sans-serif' }}>
                        
                        {/* Header */}
                        <div className="flex border-b-2 border-black">
                            {/* Logo */}
                            <div className="w-1/3 p-2 border-r-2 border-black">
                                <div className="text-orange-500 font-bold text-lg">Shoppi</div>
                                <div className="text-orange-500 font-bold text-sm">ShoppiXPRESS</div>
                            </div>
                            {/* Barcode & Tracking */}
                            <div className="w-2/3 p-2">
                                {/* Real Barcode - Code128 format */}
                                <div className="flex justify-center mb-1">
                                    <Barcode 
                                        value={labelData.trackingNumber}
                                        format="CODE128"
                                        width={1.2}
                                        height={40}
                                        fontSize={0}
                                        margin={0}
                                        displayValue={false}
                                    />
                                </div>
                                <div className="text-xs">
                                    <span className="font-semibold">Mã vận đơn: </span>
                                    <span className="font-mono">{labelData.trackingNumber}</span>
                                </div>
                                <div className="text-xs">
                                    <span className="font-semibold">Mã đơn hàng: </span>
                                    <span className="font-mono">{labelData.orderNumber || labelData.orderId.slice(0, 16).toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sender & Receiver */}
                        <div className="flex border-b-2 border-black">
                            {/* Sender */}
                            <div className="w-1/2 p-2 border-r-2 border-black min-h-[80px]">
                                <div className="text-xs font-bold mb-1">Từ:</div>
                                <div className="text-xs">{labelData.sender.name}</div>
                                <div className="text-xs">{labelData.sender.phone}</div>
                                <div className="text-xs leading-tight">{labelData.sender.address}</div>
                            </div>
                            {/* Receiver */}
                            <div className="w-1/2 p-2 min-h-[80px]">
                                <div className="text-xs font-bold mb-1">Đến: <span className="font-normal">(Chỉ giao giờ hành chính)</span></div>
                                <div className="text-xs font-semibold">{labelData.receiver.name}</div>
                                <div className="text-xs">{labelData.receiver.phone}</div>
                                <div className="text-xs leading-tight">{labelData.receiver.address}</div>
                            </div>
                        </div>

                        {/* Sort Code */}
                        <div className="border-b-2 border-black p-2 text-center">
                            <div className="text-2xl font-bold font-mono tracking-wider">{sortCode}</div>
                        </div>

                        {/* Product Info & QR */}
                        <div className="flex border-b-2 border-black">
                            {/* Product List */}
                            <div className="w-2/3 p-2 border-r-2 border-black">
                                <div className="text-xs font-bold mb-1">
                                    Nội dung hàng (Tổng SL sản phẩm: {labelData.package.itemCount})
                                </div>
                                {labelData.items && labelData.items.length > 0 ? (
                                    labelData.items.map((item, idx) => (
                                        <div key={idx} className="text-xs">
                                            {idx + 1}. {item.name}{item.variant ? ` - ${item.variant}` : ''}, SL: {item.quantity}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-gray-500">Xem chi tiết trên ứng dụng</div>
                                )}
                            </div>
                            {/* QR Code & Date */}
                            <div className="w-1/3 p-2 flex flex-col items-center justify-between">
                                {/* Real QR Code - contains shipment data for shipper app */}
                                <QRCodeSVG 
                                    value={qrData}
                                    size={64}
                                    level="M"
                                    includeMargin={false}
                                />
                                <div className="text-center mt-2">
                                    <div className="text-[10px] text-gray-600">Ngày đặt hàng:</div>
                                    <div className="text-xs font-bold">{dateInfo.date}</div>
                                    <div className="text-xs font-bold">{dateInfo.time}</div>
                                </div>
                            </div>
                        </div>

                        {/* Notice */}
                        <div className="border-b-2 border-black p-2">
                            <div className="text-[10px] text-gray-600 leading-tight">
                                Kiểm tra tên sản phẩm và đối chiếu Mã vận đơn/Mã đơn hàng trên ứng dụng Shoppi trước khi nhận hàng 
                                (Lưu ý: Một số sản phẩm có thể bị ẩn do danh sách quá dài).
                            </div>
                        </div>

                        {/* COD & Signature */}
                        <div className="flex border-b-2 border-black">
                            {/* COD Amount */}
                            <div className="w-1/2 p-2 border-r-2 border-black">
                                <div className="text-xs font-bold mb-1">Tiền thu Người nhận:</div>
                                <div className={`text-xl font-bold ${labelData.payment.isCod ? 'text-orange-600' : ''}`}>
                                    {labelData.payment.isCod ? `${formatCurrency(labelData.payment.codAmount)} VND` : '0 VND'}
                                </div>
                            </div>
                            {/* Weight & Signature */}
                            <div className="w-1/2 p-2">
                                <div className="border border-black p-1 mb-1 text-center">
                                    <span className="text-[10px]">Khối lượng tối đa: </span>
                                    <span className="text-xs font-bold">{labelData.package.weight ? `${labelData.package.weight}g` : '500g'}</span>
                                </div>
                                <div className="border border-black p-1 text-center">
                                    <div className="text-[10px] font-bold">Chữ ký người nhận</div>
                                    <div className="text-[9px] text-gray-500 leading-tight">
                                        Xác nhận hàng nguyên vẹn, không móp/méo, bể/vỡ
                                    </div>
                                    <div className="h-8"></div>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Notes */}
                        <div className="p-2 border-b-2 border-black">
                            <div className="text-[10px]">
                                <span className="font-bold">Chỉ dẫn giao hàng: </span>
                                {labelData.delivery.notes || 'Không đóng kiểm; Chuyển hoàn sau 3 lần phát; Lưu kho tối đa 5 ngày'}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-orange-500 text-white text-center py-1">
                            <div className="text-xs font-bold">
                                Shoppi Express - Giao hàng nhanh chóng - Hotline: 1900 xxxx
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
