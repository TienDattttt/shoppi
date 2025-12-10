import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Loader2, Save, Info } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { productService } from "@/services/product.service";
import { toast } from "sonner";
import { ImageUpload } from "@/components/common/ImageUpload";

interface Category {
    id: string;
    name: string;
    slug: string;
}

export default function ProductAdd() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    // Form state matching products table schema
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        short_description: "",
        base_price: "",
        compare_at_price: "",
        category_id: "",
        quantity: "0", // For default variant
        meta_title: "",
        meta_description: "",
        images: [] as string[]
    });

    useEffect(() => {
        loadCategories();
        if (isEditMode && id) {
            loadProduct(id);
        }
    }, [id, isEditMode]);

    const loadCategories = async () => {
        try {
            const response = await productService.getCategories();
            // Handle both { data: [...] } and direct array response
            const cats = Array.isArray(response) ? response : (response?.data || []);
            setCategories(cats);
        } catch (error) {
            console.error("Failed to load categories", error);
            setCategories([]);
        }
    };


    const loadProduct = async (productId: string) => {
        setFetching(true);
        try {
            const response = await productService.getProductById(productId);
            // Handle both { data: {...} } and direct object response
            const data = response?.data || response;
            console.log("Loaded product data:", data);
            
            // Backend returns camelCase (basePrice, shortDescription, etc.)
            setFormData({
                name: data.name || "",
                description: data.description || "",
                short_description: data.shortDescription || data.short_description || "",
                base_price: String(data.basePrice || data.base_price || ""),
                compare_at_price: String(data.compareAtPrice || data.compare_at_price || ""),
                category_id: data.categoryId || data.category_id || "",
                quantity: String(data.variants?.[0]?.quantity || "0"),
                meta_title: data.metaTitle || data.meta_title || "",
                meta_description: data.metaDescription || data.meta_description || "",
                images: data.images?.map((img: { url: string }) => img.url) || []
            });
        } catch (error) {
            console.error("Load product error:", error);
            toast.error("Không thể tải thông tin sản phẩm");
            navigate("/partner/products");
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.name.trim()) {
            toast.error("Vui lòng nhập tên sản phẩm");
            return;
        }
        if (!formData.base_price || Number(formData.base_price) <= 0) {
            toast.error("Vui lòng nhập giá sản phẩm hợp lệ");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: formData.name.trim(),
                description: formData.description,
                short_description: formData.short_description,
                base_price: Number(formData.base_price),
                compare_at_price: formData.compare_at_price ? Number(formData.compare_at_price) : null,
                category_id: formData.category_id || null,
                quantity: Number(formData.quantity) || 0,
                meta_title: formData.meta_title,
                meta_description: formData.meta_description,
                product_images: formData.images
            };

            if (isEditMode && id) {
                await productService.updateProduct(id, payload);
                toast.success("Cập nhật sản phẩm thành công");
            } else {
                await productService.createProduct(payload);
                toast.success("Tạo sản phẩm thành công");
            }
            navigate("/partner/products");
        } catch (error) {
            console.error("Failed to save", error);
            toast.error("Không thể lưu sản phẩm");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-8 text-center">Đang tải thông tin sản phẩm...</div>;


    return (
        <div className="max-w-4xl mx-auto pb-20 relative">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 sticky top-[64px] z-10 bg-background/95 backdrop-blur py-4 -mx-6 px-6 border-b border-border/40">
                <Button variant="ghost" size="icon" onClick={() => navigate("/partner/products")} className="rounded-full hover:bg-muted">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {isEditMode ? "Chỉnh Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isEditMode ? "Cập nhật thông tin sản phẩm" : "Tạo sản phẩm mới cho cửa hàng của bạn"}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Basic Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
                        <Card className="shadow-premium border-border/50">
                            <CardHeader>
                                <CardTitle>Thông Tin Cơ Bản</CardTitle>
                                <CardDescription>Tên, mô tả và hình ảnh sản phẩm</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Product Images */}
                                <div className="space-y-3">
                                    <Label className="text-base">Hình Ảnh Sản Phẩm *</Label>
                                    <ImageUpload
                                        value={formData.images}
                                        onChange={(val) => setFormData(prev => ({ ...prev, images: val as string[] }))}
                                        maxFiles={5}
                                    />
                                    <p className="text-xs text-muted-foreground">Tải lên ít nhất 1 hình ảnh. JPG, PNG tối đa 5MB.</p>
                                </div>

                                {/* Product Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Tên Sản Phẩm *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="Nhập tên sản phẩm..."
                                        className="h-11"
                                        value={formData.name}
                                        onChange={handleChange}
                                        maxLength={200}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">{formData.name.length}/200 ký tự</p>
                                </div>

                                {/* Short Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="short_description">Mô Tả Ngắn</Label>
                                    <Textarea
                                        id="short_description"
                                        name="short_description"
                                        placeholder="Mô tả ngắn gọn về sản phẩm (hiển thị trong danh sách)..."
                                        className="min-h-[80px] resize-none"
                                        value={formData.short_description}
                                        onChange={handleChange}
                                        maxLength={500}
                                    />
                                    <p className="text-xs text-muted-foreground">{formData.short_description.length}/500 ký tự</p>
                                </div>

                                {/* Full Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description">Mô Tả Chi Tiết *</Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        placeholder="Mô tả chi tiết về sản phẩm..."
                                        className="min-h-[200px] resize-none"
                                        value={formData.description}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </CardContent>
                        </Card>


                        {/* Sales Information */}
                        <Card className="shadow-premium border-border/50">
                            <CardHeader>
                                <CardTitle>Thông Tin Bán Hàng</CardTitle>
                                <CardDescription>Giá và số lượng tồn kho</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Base Price */}
                                <div className="space-y-2">
                                    <Label htmlFor="base_price">Giá Bán (VND) *</Label>
                                    <Input
                                        id="base_price"
                                        name="base_price"
                                        type="number"
                                        placeholder="0"
                                        className="h-11"
                                        value={formData.base_price}
                                        onChange={handleChange}
                                        min={0}
                                        required
                                    />
                                </div>

                                {/* Compare at Price */}
                                <div className="space-y-2">
                                    <Label htmlFor="compare_at_price">Giá Gốc (VND)</Label>
                                    <Input
                                        id="compare_at_price"
                                        name="compare_at_price"
                                        type="number"
                                        placeholder="0"
                                        className="h-11"
                                        value={formData.compare_at_price}
                                        onChange={handleChange}
                                        min={0}
                                    />
                                    <p className="text-xs text-muted-foreground">Để trống nếu không có giảm giá</p>
                                </div>

                                {/* Initial Stock */}
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Số Lượng Tồn Kho *</Label>
                                    <Input
                                        id="quantity"
                                        name="quantity"
                                        type="number"
                                        placeholder="0"
                                        className="h-11"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        min={0}
                                        required
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* SEO Section */}
                        <Card className="shadow-premium border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    SEO
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </CardTitle>
                                <CardDescription>Tối ưu hóa cho công cụ tìm kiếm</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="meta_title">Tiêu Đề SEO</Label>
                                    <Input
                                        id="meta_title"
                                        name="meta_title"
                                        placeholder="Tiêu đề hiển thị trên kết quả tìm kiếm..."
                                        className="h-11"
                                        value={formData.meta_title}
                                        onChange={handleChange}
                                        maxLength={100}
                                    />
                                    <p className="text-xs text-muted-foreground">{formData.meta_title.length}/100 ký tự</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="meta_description">Mô Tả SEO</Label>
                                    <Textarea
                                        id="meta_description"
                                        name="meta_description"
                                        placeholder="Mô tả ngắn hiển thị trên kết quả tìm kiếm..."
                                        className="min-h-[80px] resize-none"
                                        value={formData.meta_description}
                                        onChange={handleChange}
                                        maxLength={200}
                                    />
                                    <p className="text-xs text-muted-foreground">{formData.meta_description.length}/200 ký tự</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>


                    {/* Right Column: Organization */}
                    <div className="space-y-6">
                        <Card className="shadow-premium border-border/50">
                            <CardHeader>
                                <CardTitle>Phân Loại</CardTitle>
                                <CardDescription>Danh mục sản phẩm</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Danh Mục</Label>
                                    <Select
                                        value={formData.category_id}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                                    >
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Chọn danh mục..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Status Info */}
                        <Card className="shadow-premium border-border/50 bg-muted/30">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-foreground">Lưu ý</p>
                                        <p className="text-muted-foreground mt-1">
                                            Sản phẩm mới sẽ ở trạng thái "Chờ duyệt" và cần được Admin phê duyệt trước khi hiển thị cho khách hàng.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Fixed Bottom Actions */}
                <div className="flex justify-end gap-4 fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur border-t border-border/40 p-4 shadow-lg z-50">
                    <div className="max-w-4xl w-full mx-auto flex justify-end gap-4 px-6 md:px-0">
                        <Button type="button" variant="outline" onClick={() => navigate("/partner/products")} className="shadow-sm">
                            Hủy
                        </Button>
                        <Button type="submit" className="bg-primary hover:bg-primary/90 shadow-md min-w-[150px]" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isEditMode ? "Cập Nhật" : "Lưu Sản Phẩm"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
