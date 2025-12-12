import { useState } from "react";
import { Ticket, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function VoucherInput() {
    const navigate = useNavigate();

    return (
        <div className="bg-white p-4 rounded-sm shadow-sm flex items-center justify-between border-b border-dashed">
            <div className="flex items-center gap-2 text-shopee-orange font-medium text-sm">
                <Ticket className="h-5 w-5" />
                <span>Voucher Shoppi</span>
            </div>

            <button 
                onClick={() => navigate("/vouchers")}
                className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
            >
                Săn thêm voucher
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}
