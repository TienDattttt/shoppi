# KẾ HOẠCH TEST BACKEND + DASHBOARD

## 1. TỔNG QUAN

### Backend API Base URL
- Development: `http://localhost:3000/api`
- Các module đã implement: Auth, Product, Order, Shop, Chat, Notification, Shipper

### Dashboard
- Development: `http://localhost:5173`
- Roles: Admin, Partner, Customer

---

## 2. CHECKLIST TEST THEO ROLE

### 2.1 ADMIN ROLE

#### Auth
- [x] Login với email/password (admin@test.com)
- [x] Logout
- [x] Refresh token
- [x] Get current user (/auth/me)

#### User Management
- [x] List users (/admin/users)
- [x] View user detail (/users/:id)
- [ ] Approve partner/shipper account (/auth/admin/approve/:userId)
- [ ] Reject account (/auth/admin/reject/:userId)

#### Shop Management
- [x] List all shops (/shops)
- [x] View pending shops (/shops/admin/pending)
- [x] View shop detail (/shops/:id)
- [x] Approve shop (/shops/:id/approve)
- [x] Reject shop (/shops/:id/reject)
- [ ] Request revision (/shops/:id/revision)

#### Category Management
- [x] List categories (/categories)
- [x] Create category (/categories)
- [x] Update category (/categories/:id)
- [x] Delete category (/categories/:id)

#### Product Approval
- [x] List pending products
- [x] Approve product (/admin/products/:id/approve)
- [x] Reject product (/admin/products/:id/reject)
- [x] Request revision (/admin/products/:id/revision)

#### Order Management
- [x] List all orders (/orders)
- [x] View order detail (/orders/:id)

#### Voucher Management
- [X] List vouchers (/vouchers)
- [X] Create system voucher (/vouchers)
- [X] Update voucher (/vouchers/:id)
- [X] Delete voucher (/vouchers/:id)

#### Shipper Management
- [x] List shippers (/shippers)
- [x] View shipper detail (/shippers/:id)

---

### 2.2 PARTNER ROLE

#### Auth
- [x] Register partner (/auth/register/partner)
- [x] Login
- [x] Verify email

#### Shop Profile
- [x] Get my shop (/shops/me)
- [x] Create shop (/shops)
- [x] Update shop (/shops/:id)
- [x] Upload logo (/shops/:id/logo)
- [x] Upload banner (/shops/:id/banner)
- [x] View followers (/shops/:id/followers)

#### Product Management
- [x] List my products (/products?shopId=...)
- [x] Create product (/products)
- [x] Update product (/products/:id)
- [x] Delete product (/products/:id)
- [x] Add variant (/products/:id/variants)
- [ ] Update variant (/products/:id/variants/:variantId)
- [ ] Delete variant (/products/:id/variants/:variantId)
- [ ] Upload images (/products/:id/images)
- [ ] Update inventory (/products/:id/inventory)

#### Order Management
- [ ] List shop orders (/partner/orders)
- [ ] Confirm order (/partner/orders/:id/confirm)
- [ ] Pack order (/partner/orders/:id/pack)
- [ ] Cancel order (/partner/orders/:id/cancel)

#### Voucher Management
- [x] List shop vouchers (/vouchers?shopId=...)
- [x] Create shop voucher (/vouchers)

#### Review Management
- [x] List product reviews (/reviews?productId=...)
- [x] Reply to review (/reviews/:id/reply)

#### Chat
- [ ] List conversations (/chat/conversations)
- [ ] Get messages (/chat/messages?conversationId=...)
- [ ] Send message (/chat/messages)

---

### 2.3 CUSTOMER ROLE

#### Auth
- [x] Register customer (/auth/register/customer)
- [x] Login with email/password
- [x] Login with OTP (/auth/login/otp/request, /auth/login/otp/verify)
- [ ] Forgot password (/auth/password/reset/request)
- [ ] Reset password (/auth/password/reset/verify)

#### Product Browsing
- [x] Search products (/products?q=...)
- [x] View product detail (/products/:id)
- [x] View product reviews (/products/:id/reviews)
- [x] Filter by category (/products?categoryId=...)

#### Shop
- [x] View shop profile (/shops/:id)
- [x] Follow shop (/shops/:id/follow)
- [x] Unfollow shop (/shops/:id/follow - DELETE)
- [x] Get followed shops (/users/me/following)

#### Cart
- [x] Get cart (/cart)
- [x] Add to cart (/cart/items)
- [x] Update cart item (/cart/items/:id)
- [x] Remove from cart (/cart/items/:id)

#### Checkout & Order
- [x] Checkout (/orders/checkout)
- [x] List my orders (/orders)
- [x] View order detail (/orders/:id)
- [x] Cancel order (/orders/:id/cancel)
- [x] Confirm receipt (/orders/:id/confirm-receipt)
- [ ] Request return (/orders/:id/return)

#### Payment
- [x] Create payment session (/payments/create-session)
- [x] Payment webhooks (MoMo, VNPay, ZaloPay)

#### Voucher
- [x] Validate voucher (/vouchers/validate)

#### Review
- [ ] Create review (/products/:id/reviews)


#### Notification
- [x] List notifications (/notifications)
- [x] Mark as read (/notifications/:id/read)
- [x] Update preferences (/notifications/preferences)

#### Chat
- [x] Create conversation (/chat/conversations)
- [x] List conversations (/chat/conversations)
- [x] Send message (/chat/messages)

---

### 2.4 SHIPPER ROLE

#### Auth
- [ ] Register shipper (/auth/register/shipper)
- [ ] Login

#### Shipment
- [ ] List assigned shipments (/shipments?shipperId=...)
- [ ] View shipment detail (/shipments/:id)
- [ ] Pickup order (/shipper/orders/:id/pickup)
- [ ] Deliver order (/shipper/orders/:id/deliver)
- [ ] Fail delivery (/shipper/orders/:id/fail)

#### Location Tracking
- [ ] Update location (/shipments/:id/track)
- [ ] Get current location (/shipments/:id/location)

---

## 3. TEST DATA CẦN TẠO

### Users
```sql
-- Admin
INSERT INTO users (email, password_hash, role, status, full_name) 
VALUES ('admin@test.com', '<hashed_password>', 'admin', 'active', 'Admin User');

-- Partner
INSERT INTO users (email, phone, password_hash, role, status, full_name, business_name) 
VALUES ('partner@test.com', '0901234567', '<hashed_password>', 'partner', 'active', 'Partner User', 'Test Shop');

-- Customer
INSERT INTO users (email, phone, password_hash, role, status, full_name) 
VALUES ('customer@test.com', '0909876543', '<hashed_password>', 'customer', 'active', 'Customer User');

-- Shipper
INSERT INTO users (phone, password_hash, role, status, full_name) 
VALUES ('0908765432', '<hashed_password>', 'shipper', 'active', 'Shipper User');
```

### Categories
```sql
INSERT INTO categories (name, slug, description) VALUES 
('Điện tử', 'dien-tu', 'Thiết bị điện tử'),
('Thời trang', 'thoi-trang', 'Quần áo, giày dép'),
('Gia dụng', 'gia-dung', 'Đồ gia dụng');
```

---

## 4. LUỒNG TEST CHÍNH

### Luồng 1: Đăng ký Partner → Tạo Shop → Duyệt Shop
1. Partner đăng ký tài khoản
2. Admin duyệt tài khoản Partner
3. Partner tạo Shop
4. Admin duyệt Shop
5. Partner thêm sản phẩm
6. Admin duyệt sản phẩm

### Luồng 2: Customer mua hàng
1. Customer đăng ký/đăng nhập
2. Tìm kiếm sản phẩm
3. Thêm vào giỏ hàng
4. Checkout với voucher
5. Thanh toán
6. Partner xác nhận đơn
7. Shipper giao hàng
8. Customer xác nhận nhận hàng
9. Customer đánh giá sản phẩm

### Luồng 3: Chat Customer ↔ Shop
1. Customer tạo conversation với Shop
2. Gửi tin nhắn
3. Partner trả lời
4. Realtime update

---

## 5. CÔNG CỤ TEST

- **Postman/Insomnia**: Test API trực tiếp
- **Browser DevTools**: Debug network requests
- **Supabase Dashboard**: Kiểm tra data trong DB
- **Redis CLI**: Kiểm tra cache
- **RabbitMQ Management**: Kiểm tra message queue

---

## 6. NEXT STEPS

1. ✅ Đọc source code backend và dashboard
2. ✅ Cập nhật dashboard services để match với backend API
3. ⏳ Tạo test data trong Supabase
4. ⏳ Chạy backend server
5. ⏳ Test từng API endpoint
6. ⏳ Test luồng nghiệp vụ end-to-end

---

## 7. HƯỚNG DẪN CHẠY TEST

### 7.1 Chạy Backend
```bash
cd backend
npm install
npm run dev
```

Backend sẽ chạy tại: http://localhost:3000

### 7.2 Chạy Dashboard
```bash
cd dashboard
npm install

# Tạo file .env từ .env.example
cp .env.example .env
# Sửa VITE_API_URL=http://localhost:3000/api

npm run dev
```

Dashboard sẽ chạy tại: http://localhost:5173

### 7.3 Tạo Test Users trong Supabase

Chạy SQL sau trong Supabase SQL Editor:

```sql
-- Tạo Admin user
INSERT INTO users (id, email, password_hash, role, status, full_name)
VALUES (
  gen_random_uuid(),
  'admin@test.com',
  '$2a$10$rQnM1234567890abcdefghijklmnopqrstuvwxyz', -- password: Admin@123
  'admin',
  'active',
  'Admin User'
);

-- Tạo Partner user
INSERT INTO users (id, email, phone, password_hash, role, status, full_name, business_name)
VALUES (
  gen_random_uuid(),
  'partner@test.com',
  '0901234567',
  '$2a$10$rQnM1234567890abcdefghijklmnopqrstuvwxyz', -- password: Partner@123
  'partner',
  'active',
  'Partner User',
  'Test Shop'
);

-- Tạo Customer user
INSERT INTO users (id, email, phone, password_hash, role, status, full_name)
VALUES (
  gen_random_uuid(),
  'customer@test.com',
  '0909876543',
  '$2a$10$rQnM1234567890abcdefghijklmnopqrstuvwxyz', -- password: Customer@123
  'customer',
  'active',
  'Customer User'
);

-- Tạo Shipper user
INSERT INTO users (id, email, phone, password_hash, role, status, full_name, vehicle_type, vehicle_plate)
VALUES (
  gen_random_uuid(),
  'shipper@test.com',
  '0908765432',
  '$2a$10$rQnM1234567890abcdefghijklmnopqrstuvwxyz', -- password: Shipper@123
  'shipper',
  'active',
  'Shipper User',
  'motorcycle',
  '59A1-12345'
);

-- Tạo Categories
INSERT INTO categories (id, name, slug, description, is_active) VALUES
(gen_random_uuid(), 'Điện tử', 'dien-tu', 'Thiết bị điện tử', true),
(gen_random_uuid(), 'Thời trang', 'thoi-trang', 'Quần áo, giày dép', true),
(gen_random_uuid(), 'Gia dụng', 'gia-dung', 'Đồ gia dụng', true),
(gen_random_uuid(), 'Thực phẩm', 'thuc-pham', 'Thực phẩm, đồ uống', true);
```

### 7.4 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | Admin@123 |
| Partner | partner@test.com | Partner@123 |
| Customer | customer@test.com | Customer@123 |
| Shipper | shipper@test.com | Shipper@123 |

---

## 8. API ENDPOINTS MAPPING

### Backend Routes → Dashboard Services

| Backend Route | Dashboard Service Method |
|---------------|-------------------------|
| POST /api/auth/login | authService.login() |
| POST /api/auth/register/customer | authService.registerCustomer() |
| POST /api/auth/register/partner | authService.registerPartner() |
| GET /api/auth/me | authService.getCurrentUser() |
| POST /api/auth/logout | authService.logout() |
| GET /api/products | productService.searchProducts() |
| POST /api/products | productService.createProduct() |
| GET /api/products/:id | productService.getProductById() |
| GET /api/categories | productService.getCategories() |
| GET /api/shops | shopService.listShops() |
| POST /api/shops | shopService.createShop() |
| GET /api/shops/me | shopService.getMyShop() |
| POST /api/shops/:id/approve | shopService.approveShop() |
| GET /api/cart | orderService.getCart() |
| POST /api/orders/checkout | orderService.checkout() |
| GET /api/orders | orderService.getOrders() |
| GET /api/partner/orders | orderService.getPartnerOrders() |
| GET /api/chat/conversations | chatService.getConversations() |
| POST /api/chat/messages | chatService.sendMessage() |
| GET /api/notifications | notificationService.getNotifications() |

---

## 9. KNOWN ISSUES & FIXES

### Issue 1: CORS Error
Nếu gặp CORS error, kiểm tra backend CORS config:
```javascript
// backend/src/app.js
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
```

### Issue 2: Token không được gửi
Dashboard đã được cập nhật để tự động gửi token trong header Authorization.
Kiểm tra localStorage có `auth-storage` key.

### Issue 3: API URL không đúng
Dashboard đã được cập nhật để sử dụng `/api` thay vì `/api/v1`.
Kiểm tra file `dashboard/.env` có `VITE_API_URL=http://localhost:3000/api`
