import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Mock data for Vietnam locations
// In a real app, this would come from an API or a large JSON library
const LOCATIONS: Record<string, { name: string; districts: Record<string, { name: string; wards: string[] }> }> = {
    hanoi: {
        name: "Hà Nội",
        districts: {
            badinh: { name: "Ba Đình", wards: ["Phúc Xá", "Trúc Bạch", "Vĩnh Phúc"] },
            hoankiem: { name: "Hoàn Kiếm", wards: ["Phúc Tân", "Đồng Xuân", "Hàng Mã"] },
            causegiay: { name: "Cầu Giấy", wards: ["Nghĩa Đô", "Quan Hoa", "Dịch Vọng"] }
        }
    },
    hcm: {
        name: "TP. Hồ Chí Minh",
        districts: {
            d1: { name: "Quận 1", wards: ["Bến Nghé", "Bến Thành", "Cô Giang"] },
            d3: { name: "Quận 3", wards: ["Phường 1", "Phường 2", "Phường 3"] },
            binhthanh: { name: "Bình Thạnh", wards: ["Phường 1", "Phường 2", "Phường 3"] }
        }
    },
    danang: {
        name: "Đà Nẵng",
        districts: {
            haichau: { name: "Hải Châu", wards: ["Hải Châu 1", "Hải Châu 2"] },
            thanhkhe: { name: "Thanh Khê", wards: ["Tam Thuận", "Thanh Khê Tây"] }
        }
    }
};

interface AddressPickerProps {
    city?: string;
    district?: string;
    ward?: string;
    onCityChange: (city: string) => void;
    onDistrictChange: (district: string) => void;
    onWardChange: (ward: string) => void;
}

export function AddressPicker({
    city, district, ward,
    onCityChange, onDistrictChange, onWardChange
}: AddressPickerProps) {
    const [districts, setDistricts] = useState<any[]>([]);
    const [wards, setWards] = useState<string[]>([]);

    // Update districts when city changes
    useEffect(() => {
        if (city && LOCATIONS[city as keyof typeof LOCATIONS]) {
            const cityData = LOCATIONS[city as keyof typeof LOCATIONS];
            setDistricts(Object.entries(cityData.districts).map(([key, val]) => ({ id: key, ...val })));
        } else {
            setDistricts([]);
        }
    }, [city]);

    // Update wards when district changes
    useEffect(() => {
        if (city && district) {
            const cityData = LOCATIONS[city as keyof typeof LOCATIONS];
            const districtData = cityData?.districts[district as keyof typeof cityData.districts];
            if (districtData) {
                setWards(districtData.wards);
            } else {
                setWards([]);
            }
        } else {
            setWards([]);
        }
    }, [city, district]);

    const handleCityChange = (value: string) => {
        onCityChange(value);
        onDistrictChange("");
        onWardChange("");
    };

    const handleDistrictChange = (value: string) => {
        onDistrictChange(value);
        onWardChange("");
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
                <Label>Tỉnh / Thành phố</Label>
                <Select value={city} onValueChange={handleCityChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Chọn Tỉnh/Thành phố" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(LOCATIONS).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label>Quận / Huyện</Label>
                <Select value={district} onValueChange={handleDistrictChange} disabled={!city}>
                    <SelectTrigger>
                        <SelectValue placeholder="Chọn Quận/Huyện" />
                    </SelectTrigger>
                    <SelectContent>
                        {districts.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label>Phường / Xã</Label>
                <Select value={ward} onValueChange={onWardChange} disabled={!district}>
                    <SelectTrigger>
                        <SelectValue placeholder="Chọn Phường/Xã" />
                    </SelectTrigger>
                    <SelectContent>
                        {wards.map((w) => (
                            <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
