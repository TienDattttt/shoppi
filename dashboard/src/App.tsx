import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster } from "sonner";
import { useAuthStore } from "@/store/authStore";
import LoadingFallback from "@/components/common/LoadingFallback";

// Lazy Load Layouts
const AdminLayout = lazy(() => import("@/components/layout/AdminLayout"));
const PartnerLayout = lazy(() => import("@/components/layout/PartnerLayout"));
const CustomerLayout = lazy(() => import("@/components/customer/layout/CustomerLayout"));
const AccountLayout = lazy(() => import("@/components/customer/account/AccountLayout"));

// Lazy Load Shared Pages
const NotFoundPage = lazy(() => import("@/pages/shared/NotFoundPage"));
const NotificationPage = lazy(() => import("@/pages/shared/NotificationPage")); // Ensure this exists or use Customer one

// Lazy Load Auth Pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPage = lazy(() => import("@/pages/auth/ResetPage"));

// Lazy Load Admin Pages
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const UserManagement = lazy(() => import("@/pages/admin/UserManagement"));
const ShopManagement = lazy(() => import("@/pages/admin/ShopManagement"));
// ... (omitting some admin pages for brevity if they are not core to this user request, but maintaining structure) 
// Actually, to be safe and avoid breaking, I should lazy load ALL of them or imported normally. 
// Given the file length, I will proceed with Lazy Loading ALL major pages to fulfill Phase 18.
const CategoryManagement = lazy(() => import("@/pages/admin/CategoryManagement"));
const ProductApproval = lazy(() => import("@/pages/admin/ProductApproval"));
const OrderManagement = lazy(() => import("@/pages/admin/OrderManagement"));
const VoucherManagement = lazy(() => import("@/pages/admin/VoucherManagement"));
const ShipperManagement = lazy(() => import("@/pages/admin/ShipperManagement"));
const Reports = lazy(() => import("@/pages/admin/Reports"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const UserDetail = lazy(() => import("@/pages/admin/UserDetail"));
const ShopDetail = lazy(() => import("@/pages/admin/ShopDetail"));
const OrderDetail = lazy(() => import("@/pages/shared/OrderDetail")); // Shared
const ShipperDetail = lazy(() => import("@/pages/admin/ShipperDetail"));
const ProductDetail = lazy(() => import("@/pages/admin/ProductDetail"));
const VoucherDetail = lazy(() => import("@/pages/admin/VoucherDetail"));

// Lazy Load Partner Pages
const PartnerDashboard = lazy(() => import("@/pages/partner/PartnerDashboard"));
const ProductManagement = lazy(() => import("@/pages/partner/ProductManagement"));
const ProductAdd = lazy(() => import("@/pages/partner/ProductAdd"));
const ShopProfile = lazy(() => import("@/pages/partner/ShopProfile"));
const PartnerOrderManagement = lazy(() => import("@/pages/partner/PartnerOrderManagement"));
const PartnerVoucherManagement = lazy(() => import("@/pages/partner/PartnerVoucherManagement"));
const InventoryManagement = lazy(() => import("@/pages/partner/InventoryManagement"));
const ReviewManagement = lazy(() => import("@/pages/partner/ReviewManagement"));
const FollowersManagement = lazy(() => import("@/pages/partner/FollowersManagement"));
const Chat = lazy(() => import("@/pages/partner/Chat"));
const PartnerSettings = lazy(() => import("@/pages/partner/PartnerSettings"));
const PartnerReports = lazy(() => import("@/pages/partner/PartnerReports"));

// Lazy Load Customer Pages
const HomePage = lazy(() => import("@/pages/customer/HomePage"));
const ProductSearchPage = lazy(() => import("@/pages/customer/ProductSearchPage"));
const ProductListingPage = lazy(() => import("@/pages/customer/ProductListingPage"));
const ShopPage = lazy(() => import("@/pages/customer/ShopPage"));
const CategoryPage = lazy(() => import("@/pages/customer/CategoryPage"));
const ProductDetailPageCustomer = lazy(() => import("@/pages/customer/ProductDetailPage"));
const CartPage = lazy(() => import("@/pages/customer/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/customer/CheckoutPage"));
const ProfilePage = lazy(() => import("@/pages/customer/account/ProfilePage"));
const AddressBookPage = lazy(() => import("@/pages/customer/account/AddressBookPage"));
const ChangePasswordPage = lazy(() => import("@/pages/customer/account/ChangePasswordPage"));
const PurchaseHistoryPage = lazy(() => import("@/pages/customer/account/PurchaseHistoryPage"));
const OrderDetailPageCustomer = lazy(() => import("@/pages/customer/account/OrderDetailPage"));
const NotificationsPageCustomer = lazy(() => import("@/pages/customer/account/NotificationsPage"));
const VoucherWalletPage = lazy(() => import("@/pages/customer/account/VoucherWalletPage"));

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: ('admin' | 'partner')[] }) => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as any)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/partner'} replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/partner" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPage />} />

          {/* Customer Routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop/:id" element={<ShopPage />} />
            <Route path="/search" element={<ProductSearchPage />} />
            <Route path="/products" element={<ProductListingPage />} />
            <Route path="/products/:slug" element={<ProductDetailPageCustomer />} />
            <Route path="/categories/:slug" element={<CategoryPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />

            {/* User Account Routes */}
            <Route path="/user" element={<AccountLayout />}>
              <Route path="profile" element={<ProfilePage />} />
              <Route path="account/address" element={<AddressBookPage />} />
              <Route path="account/password" element={<ChangePasswordPage />} />
              <Route path="purchase" element={<PurchaseHistoryPage />} />
              <Route path="purchase/order/:id" element={<OrderDetailPageCustomer />} />
              <Route path="notifications" element={<NotificationsPageCustomer />} />
              <Route path="voucher-wallet" element={<VoucherWalletPage />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><UserManagement /></AdminLayout>} />
            <Route path="/admin/users/:id" element={<AdminLayout><UserDetail /></AdminLayout>} />
            <Route path="/admin/shops" element={<AdminLayout><ShopManagement /></AdminLayout>} />
            <Route path="/admin/shops/:id" element={<AdminLayout><ShopDetail /></AdminLayout>} />
            <Route path="/admin/categories" element={<AdminLayout><CategoryManagement /></AdminLayout>} />
            <Route path="/admin/products/approval" element={<AdminLayout><ProductApproval /></AdminLayout>} />
            <Route path="/admin/products/:id" element={<AdminLayout><ProductDetail /></AdminLayout>} />
            <Route path="/admin/orders" element={<AdminLayout><OrderManagement /></AdminLayout>} />
            <Route path="/admin/orders/:id" element={<AdminLayout><OrderDetail /></AdminLayout>} />
            <Route path="/admin/vouchers" element={<AdminLayout><VoucherManagement /></AdminLayout>} />
            <Route path="/admin/vouchers/:id" element={<AdminLayout><VoucherDetail /></AdminLayout>} />
            <Route path="/admin/shippers" element={<AdminLayout><ShipperManagement /></AdminLayout>} />
            <Route path="/admin/shippers/:id" element={<AdminLayout><ShipperDetail /></AdminLayout>} />
            <Route path="/admin/reports" element={<AdminLayout><Reports /></AdminLayout>} />
            <Route path="/admin/notifications" element={<AdminLayout><NotificationPage /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
          </Route>

          {/* Partner Routes */}
          <Route element={<ProtectedRoute allowedRoles={['partner']} />}>
            <Route path="/partner" element={<PartnerLayout><PartnerDashboard /></PartnerLayout>} />
            <Route path="/partner/products" element={<PartnerLayout><ProductManagement /></PartnerLayout>} />
            <Route path="/partner/products/add" element={<PartnerLayout><ProductAdd /></PartnerLayout>} />
            <Route path="/partner/products/edit/:id" element={<PartnerLayout><ProductAdd /></PartnerLayout>} />
            <Route path="/partner/products/:id" element={<PartnerLayout><ProductAdd /></PartnerLayout>} />
            <Route path="/partner/inventory" element={<PartnerLayout><InventoryManagement /></PartnerLayout>} />
            <Route path="/partner/profile" element={<PartnerLayout><ShopProfile /></PartnerLayout>} />
            <Route path="/partner/orders" element={<PartnerLayout><PartnerOrderManagement /></PartnerLayout>} />
            <Route path="/partner/orders/:id" element={<PartnerLayout><OrderDetail /></PartnerLayout>} />
            <Route path="/partner/vouchers" element={<PartnerLayout><PartnerVoucherManagement /></PartnerLayout>} />
            <Route path="/partner/reviews" element={<PartnerLayout><ReviewManagement /></PartnerLayout>} />
            <Route path="/partner/followers" element={<PartnerLayout><FollowersManagement /></PartnerLayout>} />
            <Route path="/partner/chat" element={<PartnerLayout><Chat /></PartnerLayout>} />
            <Route path="/partner/notifications" element={<PartnerLayout><NotificationPage /></PartnerLayout>} />
            <Route path="/partner/reports" element={<PartnerLayout><PartnerReports /></PartnerLayout>} />
            <Route path="/partner/settings" element={<PartnerLayout><PartnerSettings /></PartnerLayout>} />
          </Route>

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
