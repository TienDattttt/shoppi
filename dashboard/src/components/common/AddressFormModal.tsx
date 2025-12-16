/**
 * AddressFormModal - Form thêm/sửa địa chỉ giống Shopee
 * Sử dụng Goong.io autocomplete cho địa chỉ Việt Nam
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, MapPin } from 'lucide-react';
import { AddressAutocomplete } from './AddressAutocomplete';
import { addressService } from '@/services/address.service';
import type { PlaceDetail, CreateAddressData, Address } from '@/services/address.service';
import { toast } from 'sonner';

interface AddressFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (address: Address) => void;
  editAddress?: Address | null;
  title?: string;
}

export function AddressFormModal({
  open,
  onOpenChange,
  onSuccess,
  editAddress,
  title = 'Địa chỉ mới',
}: AddressFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateAddressData>({
    name: '',
    phone: '',
    addressLine: '',
    province: '',
    district: '',
    ward: '',
    fullAddress: '',
    isDefault: false,
  });
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Reset form when modal opens/closes or editAddress changes
  useEffect(() => {
    if (open) {
      if (editAddress) {
        setFormData({
          name: editAddress.name || '',
          phone: editAddress.phone || '',
          addressLine: editAddress.addressLine || '',
          province: editAddress.province || '',
          district: editAddress.district || '',
          ward: editAddress.ward || '',
          fullAddress: editAddress.fullAddress || '',
          isDefault: editAddress.isDefault || false,
        });
      } else {
        setFormData({
          name: '',
          phone: '',
          addressLine: '',
          province: '',
          district: '',
          ward: '',
          fullAddress: '',
          isDefault: false,
        });
      }
      setCoordinates(null);
    }
  }, [open, editAddress]);

  const handleAddressSelect = (place: PlaceDetail) => {
    // Auto-fill từ Goong response
    setFormData(prev => ({
      ...prev,
      fullAddress: place.formattedAddress,
      province: place.compound?.province || prev.province,
      district: place.compound?.district || prev.district,
      ward: place.compound?.commune || prev.ward,
      // Lấy phần đầu của địa chỉ làm addressLine (số nhà, tên đường)
      addressLine: place.name || place.formattedAddress.split(',')[0] || prev.addressLine,
    }));
    
    if (place.lat && place.lng) {
      setCoordinates({ lat: place.lat, lng: place.lng });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name?.trim()) {
      toast.error('Vui lòng nhập họ tên');
      return;
    }
    if (!formData.phone?.trim()) {
      toast.error('Vui lòng nhập số điện thoại');
      return;
    }
    if (!formData.fullAddress?.trim() && !formData.addressLine?.trim()) {
      toast.error('Vui lòng nhập địa chỉ');
      return;
    }

    setSaving(true);
    try {
      // Build full address if not set
      const fullAddress = formData.fullAddress || [
        formData.addressLine,
        formData.ward,
        formData.district,
        formData.province,
      ].filter(Boolean).join(', ');

      const payload = {
        ...formData,
        fullAddress,
      };

      let result: Address;
      if (editAddress?.id) {
        result = await addressService.updateAddress(editAddress.id, payload);
        toast.success('Cập nhật địa chỉ thành công');
      } else {
        result = await addressService.createAddress(payload);
        toast.success('Thêm địa chỉ thành công');
      }

      onSuccess?.(result);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save address error:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu địa chỉ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-shopee-orange" />
            {editAddress ? 'Cập nhật địa chỉ' : title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Họ tên & SĐT */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên</Label>
              <Input
                id="name"
                placeholder="Nguyễn Văn A"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                placeholder="0912345678"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>

          {/* Address Autocomplete - Giống Shopee */}
          <div className="space-y-2">
            <Label>Tìm địa chỉ</Label>
            <AddressAutocomplete
              value={formData.fullAddress}
              placeholder="Nhập địa chỉ để tìm kiếm..."
              onSelect={handleAddressSelect}
              onChange={(value) => setFormData(prev => ({ ...prev, fullAddress: value }))}
            />
            <p className="text-xs text-muted-foreground">
              Gợi ý: Nhập số nhà, tên đường hoặc tên địa điểm
            </p>
          </div>

          {/* Chi tiết địa chỉ - Auto-fill từ autocomplete */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="province">Tỉnh/Thành phố</Label>
              <Input
                id="province"
                placeholder="TP. Hồ Chí Minh"
                value={formData.province}
                onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">Quận/Huyện</Label>
              <Input
                id="district"
                placeholder="Tân Bình"
                value={formData.district}
                onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ward">Phường/Xã</Label>
              <Input
                id="ward"
                placeholder="Phường 1"
                value={formData.ward}
                onChange={(e) => setFormData(prev => ({ ...prev, ward: e.target.value }))}
              />
            </div>
          </div>

          {/* Địa chỉ cụ thể */}
          <div className="space-y-2">
            <Label htmlFor="addressLine">Địa chỉ cụ thể (số nhà, tên đường)</Label>
            <Input
              id="addressLine"
              placeholder="263B Lê Văn Sỹ"
              value={formData.addressLine}
              onChange={(e) => setFormData(prev => ({ ...prev, addressLine: e.target.value }))}
            />
          </div>

          {/* Đặt làm mặc định */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isDefault: checked === true }))
              }
            />
            <Label htmlFor="isDefault" className="cursor-pointer text-sm">
              Đặt làm địa chỉ mặc định
            </Label>
          </div>

          {/* Hiển thị tọa độ nếu có */}
          {coordinates && (
            <p className="text-xs text-muted-foreground">
              📍 Tọa độ: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Trở lại
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-shopee-orange hover:bg-shopee-orange/90 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editAddress ? 'Cập nhật' : 'Hoàn thành'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddressFormModal;
