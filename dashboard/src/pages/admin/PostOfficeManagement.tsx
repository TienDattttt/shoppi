import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  MapPin,
  Phone,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Package,
  Warehouse,
  Eye,
  RefreshCw,
} from "lucide-react";
import { postOfficeService, type PostOffice, type PostOfficeStats } from "@/services/post-office.service";
import { toast } from "sonner";

// Region labels
const REGION_LABELS: Record<string, string> = {
  north: "Miền Bắc",
  central: "Miền Trung",
  south: "Miền Nam",
};

const OFFICE_TYPE_LABELS: Record<string, string> = {
  local: "Bưu cục",
  regional: "Kho trung chuyển",
};

export default function PostOfficeManagement() {
  const [postOffices, setPostOffices] = useState<PostOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<PostOffice | null>(null);
  const [officeStats, setOfficeStats] = useState<PostOfficeStats | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<{
    code: string;
    name_vi: string;
    address: string;
    district: string;
    city: string;
    region: 'north' | 'central' | 'south';
    lat: string;
    lng: string;
    office_type: 'local' | 'regional';
    phone: string;
  }>({
    code: "",
    name_vi: "",
    address: "",
    district: "",
    city: "",
    region: "south",
    lat: "",
    lng: "",
    office_type: "local",
    phone: "",
  });

  const loadPostOffices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await postOfficeService.getPostOffices({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        region: regionFilter || undefined,
        office_type: typeFilter || undefined,
      });
      
      const data = response.data || response;
      setPostOffices(data.data || []);
      if (data.pagination) {
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      toast.error("Không thể tải danh sách bưu cục");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, regionFilter, typeFilter]);

  useEffect(() => {
    loadPostOffices();
  }, [loadPostOffices]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadPostOffices();
  };


  const handleViewDetail = async (office: PostOffice) => {
    setSelectedOffice(office);
    setShowDetailDialog(true);
    try {
      const stats = await postOfficeService.getPostOfficeStats(office.id);
      setOfficeStats(stats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleEdit = (office: PostOffice) => {
    setSelectedOffice(office);
    setFormData({
      code: office.code,
      name_vi: office.name_vi,
      address: office.address,
      district: office.district || "",
      city: office.city || "",
      region: office.region || "south",
      lat: office.lat?.toString() || "",
      lng: office.lng?.toString() || "",
      office_type: office.office_type,
      phone: office.phone || "",
    });
    setShowCreateDialog(true);
  };

  const handleDelete = (office: PostOffice) => {
    setSelectedOffice(office);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedOffice) return;
    try {
      await postOfficeService.deletePostOffice(selectedOffice.id);
      toast.success("Đã xóa bưu cục");
      setShowDeleteDialog(false);
      loadPostOffices();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Không thể xóa bưu cục");
    }
  };

  const handleSubmit = async () => {
    try {
      const data = {
        ...formData,
        lat: formData.lat ? parseFloat(formData.lat) : undefined,
        lng: formData.lng ? parseFloat(formData.lng) : undefined,
      };

      if (selectedOffice) {
        await postOfficeService.updatePostOffice(selectedOffice.id, data);
        toast.success("Đã cập nhật bưu cục");
      } else {
        await postOfficeService.createPostOffice(data);
        toast.success("Đã tạo bưu cục mới");
      }
      
      setShowCreateDialog(false);
      resetForm();
      loadPostOffices();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Có lỗi xảy ra");
    }
  };

  const resetForm = () => {
    setSelectedOffice(null);
    setFormData({
      code: "",
      name_vi: "",
      address: "",
      district: "",
      city: "",
      region: "south",
      lat: "",
      lng: "",
      office_type: "local",
      phone: "",
    });
  };

  const handleResetDailyCounts = async () => {
    try {
      await postOfficeService.resetDailyCounts();
      toast.success("Đã reset số đơn hàng ngày");
    } catch (error) {
      toast.error("Không thể reset số đơn");
    }
  };

  // Stats summary
  const totalLocal = postOffices.filter(p => p.office_type === 'local').length;
  const totalRegional = postOffices.filter(p => p.office_type === 'regional').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Bưu cục</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý hệ thống bưu cục và kho trung chuyển
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetDailyCounts}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reset đơn ngày
          </Button>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Thêm bưu cục
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng bưu cục</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bưu cục địa phương</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalLocal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kho trung chuyển</CardTitle>
            <Warehouse className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalRegional}</div>
          </CardContent>
        </Card>
      </div>


      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên, mã bưu cục..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tất cả miền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả miền</SelectItem>
                <SelectItem value="north">Miền Bắc</SelectItem>
                <SelectItem value="central">Miền Trung</SelectItem>
                <SelectItem value="south">Miền Nam</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tất cả loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả loại</SelectItem>
                <SelectItem value="local">Bưu cục</SelectItem>
                <SelectItem value="regional">Kho trung chuyển</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" /> Tìm kiếm
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">Đang tải...</div>
          ) : postOffices.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Chưa có bưu cục nào</h3>
              <p className="text-muted-foreground mb-4">
                Chạy script seed để tạo dữ liệu bưu cục
              </p>
              <code className="bg-muted px-3 py-1 rounded text-sm">
                node src/database/seeds/vietnam-administrative.js
              </code>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên bưu cục</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Khu vực</TableHead>
                  <TableHead>Địa chỉ</TableHead>
                  <TableHead>Tọa độ</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {postOffices.map((office) => (
                  <TableRow key={office.id}>
                    <TableCell className="font-mono text-sm">{office.code}</TableCell>
                    <TableCell className="font-medium">{office.name_vi}</TableCell>
                    <TableCell>
                      <Badge variant={office.office_type === 'regional' ? 'default' : 'secondary'}>
                        {OFFICE_TYPE_LABELS[office.office_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{REGION_LABELS[office.region]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={office.address}>
                      {office.district}, {office.city}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {office.lat && office.lng ? (
                        <span className="text-green-600">
                          {Number(office.lat).toFixed(4)}, {Number(office.lng).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Chưa có</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetail(office)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(office)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(office)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={pagination.page <= 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Trước
          </Button>
          <span className="flex items-center px-4">
            Trang {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Sau
          </Button>
        </div>
      )}


      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedOffice ? "Cập nhật bưu cục" : "Thêm bưu cục mới"}</DialogTitle>
            <DialogDescription>
              {selectedOffice ? "Chỉnh sửa thông tin bưu cục" : "Nhập thông tin bưu cục mới"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Mã bưu cục *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="VD: HCM-Q1-001"
                disabled={!!selectedOffice}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="office_type">Loại *</Label>
              <Select
                value={formData.office_type}
                onValueChange={(v: 'local' | 'regional') => setFormData({ ...formData, office_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Bưu cục địa phương</SelectItem>
                  <SelectItem value="regional">Kho trung chuyển miền</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name_vi">Tên bưu cục *</Label>
              <Input
                id="name_vi"
                value={formData.name_vi}
                onChange={(e) => setFormData({ ...formData, name_vi: e.target.value })}
                placeholder="VD: Bưu cục Quận 1"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Địa chỉ *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Địa chỉ đầy đủ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">Quận/Huyện</Label>
              <Input
                id="district"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Tỉnh/Thành phố</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Miền</Label>
              <Select
                value={formData.region}
                onValueChange={(v: 'north' | 'central' | 'south') => setFormData({ ...formData, region: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="north">Miền Bắc</SelectItem>
                  <SelectItem value="central">Miền Trung</SelectItem>
                  <SelectItem value="south">Miền Nam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lat">Vĩ độ (Lat)</Label>
              <Input
                id="lat"
                type="number"
                step="0.000001"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                placeholder="10.762622"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Kinh độ (Lng)</Label>
              <Input
                id="lng"
                type="number"
                step="0.000001"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                placeholder="106.660172"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Hủy</Button>
            <Button onClick={handleSubmit}>
              {selectedOffice ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết bưu cục</DialogTitle>
            <DialogDescription>{selectedOffice?.name_vi}</DialogDescription>
          </DialogHeader>
          
          {selectedOffice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Mã bưu cục</Label>
                  <p className="font-mono">{selectedOffice.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Loại</Label>
                  <p>
                    <Badge variant={selectedOffice.office_type === 'regional' ? 'default' : 'secondary'}>
                      {OFFICE_TYPE_LABELS[selectedOffice.office_type]}
                    </Badge>
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Địa chỉ</Label>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {selectedOffice.address}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Khu vực</Label>
                  <p>{selectedOffice.district}, {selectedOffice.city}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Miền</Label>
                  <p>{REGION_LABELS[selectedOffice.region]}</p>
                </div>
                {selectedOffice.phone && (
                  <div>
                    <Label className="text-muted-foreground">Điện thoại</Label>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> {selectedOffice.phone}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Tọa độ</Label>
                  <p className="font-mono text-sm">
                    {selectedOffice.lat}, {selectedOffice.lng}
                  </p>
                </div>
              </div>

              {/* Stats */}
              {officeStats && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Thống kê shipper
                  </h4>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold">{officeStats.totalShippers}</div>
                      <div className="text-xs text-muted-foreground">Tổng shipper</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">{officeStats.onlineShippers}</div>
                      <div className="text-xs text-muted-foreground">Đang online</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">{officeStats.totalPickups}</div>
                      <div className="text-xs text-muted-foreground">Đơn lấy hôm nay</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-orange-600">{officeStats.totalDeliveries}</div>
                      <div className="text-xs text-muted-foreground">Đơn giao hôm nay</div>
                    </div>
                  </div>

                  {officeStats.shippers.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium mb-2">Danh sách shipper</h5>
                      <div className="max-h-[200px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tên</TableHead>
                              <TableHead>SĐT</TableHead>
                              <TableHead className="text-center">Lấy</TableHead>
                              <TableHead className="text-center">Giao</TableHead>
                              <TableHead className="text-center">Trạng thái</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {officeStats.shippers.map((shipper) => (
                              <TableRow key={shipper.id}>
                                <TableCell>{shipper.name}</TableCell>
                                <TableCell>{shipper.phone}</TableCell>
                                <TableCell className="text-center">{shipper.pickupCount}</TableCell>
                                <TableCell className="text-center">{shipper.deliveryCount}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={shipper.isOnline ? 'default' : 'secondary'}>
                                    {shipper.isOnline ? (shipper.isAvailable ? 'Sẵn sàng' : 'Bận') : 'Offline'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa bưu cục "{selectedOffice?.name_vi}"? 
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDelete}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
