import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import UserManagement from "@/pages/admin/UserManagement";
import ShopManagement from "@/pages/admin/ShopManagement";
import CategoryManagement from "@/pages/admin/CategoryManagement";
import ProductApproval from "@/pages/admin/ProductApproval";
import OrderManagement from "@/pages/admin/OrderManagement";
import VoucherManagement from "@/pages/admin/VoucherManagement";
import ShipperManagement from "@/pages/admin/ShipperManagement";
import Reports from "@/pages/admin/Reports";
import AdminSettings from "@/pages/admin/AdminSettings";
import UserDetail from "@/pages/admin/UserDetail";
import ShopDetail from "@/pages/admin/ShopDetail";
import OrderDetail from "@/pages/shared/OrderDetail";
import ShipperDetail from "@/pages/admin/ShipperDetail";

import PartnerLayout from "@/components/layout/PartnerLayout";
import PartnerDashboard from "@/pages/partner/PartnerDashboard";
import ProductManagement from "@/pages/partner/ProductManagement";
import ProductAdd from "@/pages/partner/ProductAdd";
import ShopProfile from "@/pages/partner/ShopProfile";
import PartnerOrderManagement from "@/pages/partner/PartnerOrderManagement";
import PartnerVoucherManagement from "@/pages/partner/PartnerVoucherManagement";
import ReviewManagement from "@/pages/partner/ReviewManagement";
import Chat from "@/pages/partner/Chat";
import PartnerSettings from "@/pages/partner/PartnerSettings";
import NotificationPage from "@/pages/shared/NotificationPage";
import LoginPage from "@/pages/auth/LoginPage";
import { useAuthStore } from "@/store/authStore";
import { Toaster } from "sonner";

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: ('admin' | 'partner')[] }) => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as any)) {
    // Redirect based on role if unauthorized
    return <Navigate to={user.role === 'admin' ? '/admin' : '/partner'} replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          } />
          <Route path="/admin/users" element={
            <AdminLayout>
              <UserManagement />
            </AdminLayout>
          } />
          <Route path="/admin/shops" element={
            <AdminLayout>
              <ShopManagement />
            </AdminLayout>
          } />
          <Route path="/admin/categories" element={
            <AdminLayout>
              <CategoryManagement />
            </AdminLayout>
          } />
          <Route path="/admin/products/approval" element={
            <AdminLayout>
              <ProductApproval />
            </AdminLayout>
          } />
          <Route path="/admin/orders" element={
            <AdminLayout>
              <OrderManagement />
            </AdminLayout>
          } />
          <Route path="/admin/vouchers" element={
            <AdminLayout>
              <VoucherManagement />
            </AdminLayout>
          } />
          <Route path="/admin/shippers" element={
            <AdminLayout>
              <ShipperManagement />
            </AdminLayout>
          } />
          <Route path="/admin/reports" element={
            <AdminLayout>
              <Reports />
            </AdminLayout>
          } />
          <Route path="/admin/users/:id" element={
            <AdminLayout>
              <UserDetail />
            </AdminLayout>
          } />
          <Route path="/admin/shops/:id" element={
            <AdminLayout>
              <ShopDetail />
            </AdminLayout>
          } />
          <Route path="/admin/orders/:id" element={
            <AdminLayout>
              <OrderDetail />
            </AdminLayout>
          } />
          <Route path="/admin/shippers/:id" element={
            <AdminLayout>
              <ShipperDetail />
            </AdminLayout>
          } />
          <Route path="/admin/notifications" element={
            <AdminLayout>
              <NotificationPage />
            </AdminLayout>
          } />
          <Route path="/admin/settings" element={
            <AdminLayout>
              <AdminSettings />
            </AdminLayout>
          } />
        </Route>

        {/* Partner Routes */}
        <Route element={<ProtectedRoute allowedRoles={['partner']} />}>
          <Route path="/partner" element={
            <PartnerLayout>
              <PartnerDashboard />
            </PartnerLayout>
          } />
          {/* ... other partner routes ... */}
          <Route path="/partner/notifications" element={
            <PartnerLayout>
              <NotificationPage />
            </PartnerLayout>
          } />
          <Route path="/partner/products" element={
            <PartnerLayout>
              <ProductManagement />
            </PartnerLayout>
          } />
          <Route path="/partner/products/add" element={
            <PartnerLayout>
              <ProductAdd />
            </PartnerLayout>
          } />
          <Route path="/partner/products/:id" element={
            <PartnerLayout>
              <ProductAdd />
            </PartnerLayout>
          } />
          <Route path="/partner/profile" element={
            <PartnerLayout>
              <ShopProfile />
            </PartnerLayout>
          } />
          <Route path="/partner/orders" element={
            <PartnerLayout>
              <PartnerOrderManagement />
            </PartnerLayout>
          } />
          <Route path="/partner/orders/:id" element={
            <PartnerLayout>
              <OrderDetail />
            </PartnerLayout>
          } />
          <Route path="/partner/vouchers" element={
            <PartnerLayout>
              <PartnerVoucherManagement />
            </PartnerLayout>
          } />
          <Route path="/partner/reviews" element={
            <PartnerLayout>
              <ReviewManagement />
            </PartnerLayout>
          } />
          <Route path="/partner/chat" element={
            <PartnerLayout>
              <Chat />
            </PartnerLayout>
          } />
          <Route path="/partner/settings" element={
            <PartnerLayout>
              <PartnerSettings />
            </PartnerLayout>
          } />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
