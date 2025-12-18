import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { locationService } from "@/services/location.service";
import { Loader2 } from "lucide-react";

interface Province {
    code: string;
    name: string;
}

interface Ward {
    code: string;
    name: string;
    districtName: string;
    provinceName: string;
}

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
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    const [districts, setDistricts] = useState<{ code: string; name: string }[]>([]);
    const [loadingProvinces, setLoadingProvinces] = useState(true);
    const [loadingWards, setLoadingWards] = useState(false);

    // Fetch provinces on mount
    useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const data = await locationService.getProvinces();
                setProvinces(data);
            } catch (error) {
                console.error("Failed to fetch provinces:", error);
            } finally {
                setLoadingProvinces(false);
            }
        };
        fetchProvinces();
    }, []);

    // Fetch wards when province changes
    useEffect(() => {
        if (!city) {
            setWards([]);
            setDistricts([]);
            return;
        }

        const fetchWards = async () => {
            setLoadingWards(true);
            try {
                const data = await locationService.getWards(city);
                setWards(data);
                
                // Extract unique districts from wards
                const uniqueDistricts = new Map<string, string>();
                data.forEach((w: Ward) => {
                    if (w.districtName && !uniqueDistricts.has(w.districtName)) {
                        uniqueDistricts.set(w.districtName, w.districtName);
                    }
                });
                setDistricts(Array.from(uniqueDistricts.entries()).map(([code, name]) => ({ code, name })));
            } catch (error) {
                console.error("Failed to fetch wards:", error);
            } finally {
                setLoadingWards(false);
            }
        };
        fetchWards();
    }, [city]);

    // Filter wards by selected district
    const filteredWards = district 
        ? wards.filter(w => w.districtName === district)
        : [];

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
                <Select value={city} onValueChange={handleCityChange} disabled={loadingProvinces}>
                    <SelectTrigger>
                        {loadingProvinces ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <SelectValue placeholder="Chọn Tỉnh/Thành phố" />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        {provinces.map((p) => (
                            <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label>Quận / Huyện</Label>
                <Select value={district} onValueChange={handleDistrictChange} disabled={!city || loadingWards}>
                    <SelectTrigger>
                        {loadingWards ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <SelectValue placeholder="Chọn Quận/Huyện" />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        {districts.map((d) => (
                            <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>
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
                        {filteredWards.map((w) => (
                            <SelectItem key={w.code} value={w.name}>{w.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
