# Test Cases - Shipper Role

## Tổng quan

Tài liệu này mô tả các test cases để kiểm tra chức năng của role Shipper trong hệ thống. Các test cases được chia theo module và chức năng.

---

## 1. Authentication & Profile

### TC-SH-001: Đăng nhập shipper
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper đăng nhập vào hệ thống |
| **Precondition** | Tài khoản shipper đã được tạo và approved |
| **Endpoint** | `POST /api/auth/login` |
| **Input** | `{ "phone": "0901234567", "password": "password123" }` |
| **Expected Result** | - Status: 200<br>- Trả về access token và refresh token<br>- User role = 'shipper' |

### TC-SH-002: Lấy thông tin profile shipper
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper xem thông tin profile của mình |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shippers/me` |
| **Headers** | `Authorization: Bearer <token>` |
| **Expected Result** | - Status: 200<br>- Trả về thông tin shipper: name, phone, vehicle_type, vehicle_plate, status, rating |

### TC-SH-003: Cập nhật thông tin shipper
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper cập nhật thông tin cá nhân |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `PATCH /api/shippers/:id` |
| **Input** | `{ "vehicle_plate": "59A-12345", "working_city": "Hồ Chí Minh" }` |
| **Expected Result** | - Status: 200<br>- Thông tin được cập nhật thành công |

---

## 2. Online/Offline Status

### TC-SH-004: Bật trạng thái online
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper bật trạng thái online để nhận đơn |
| **Precondition** | Đã đăng nhập, status = 'active' |
| **Endpoint** | `POST /api/shippers/:id/online` |
| **Input** | `{ "lat": 10.762622, "lng": 106.660172 }` |
| **Expected Result** | - Status: 200<br>- is_online = true<br>- Vị trí được cập nhật |

### TC-SH-005: Tắt trạng thái online
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper tắt trạng thái online |
| **Precondition** | Đã đăng nhập, is_online = true |
| **Endpoint** | `POST /api/shippers/:id/offline` |
| **Expected Result** | - Status: 200<br>- is_online = false |

### TC-SH-006: Không thể online khi status không phải 'active'
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper bị suspended không thể online |
| **Precondition** | Đã đăng nhập, status = 'suspended' |
| **Endpoint** | `POST /api/shippers/:id/online` |
| **Expected Result** | - Status: 400<br>- Error: "Shipper is not active" |

---

## 3. Location Tracking

### TC-SH-007: Cập nhật vị trí
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper cập nhật vị trí GPS |
| **Precondition** | Đã đăng nhập, is_online = true |
| **Endpoint** | `POST /api/shipper/location` |
| **Input** | `{ "lat": 10.762622, "lng": 106.660172, "heading": 45, "speed": 30 }` |
| **Expected Result** | - Status: 200<br>- Vị trí được lưu vào Redis và Cassandra<br>- Broadcast qua Supabase Realtime |

### TC-SH-008: Cập nhật vị trí với shipment đang giao
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Cập nhật vị trí kèm shipment ID |
| **Precondition** | Đang giao đơn hàng |
| **Endpoint** | `POST /api/shipper/location` |
| **Input** | `{ "lat": 10.762622, "lng": 106.660172, "shipmentId": "uuid" }` |
| **Expected Result** | - Status: 200<br>- Vị trí được broadcast cho customer theo dõi |

---

## 4. Shipment Management

### TC-SH-009: Lấy danh sách đơn hàng pending
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem các đơn hàng đã được assign nhưng chưa lấy |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/shipments?status=pending` |
| **Expected Result** | - Status: 200<br>- Trả về danh sách shipments với status = 'assigned' |

### TC-SH-010: Lấy danh sách đơn hàng đang giao
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem các đơn hàng đang trong quá trình giao |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/shipments?status=active` |
| **Expected Result** | - Status: 200<br>- Trả về shipments với status in ['assigned', 'picked_up', 'delivering'] |

### TC-SH-011: Lấy danh sách đơn hàng đã hoàn thành
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem lịch sử đơn hàng đã giao |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/shipments?status=completed` |
| **Expected Result** | - Status: 200<br>- Trả về shipments với status in ['delivered', 'failed', 'returned'] |

### TC-SH-012: Xem chi tiết đơn hàng
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem thông tin chi tiết của một shipment |
| **Precondition** | Đã đăng nhập, shipment được assign cho shipper này |
| **Endpoint** | `GET /api/shipper/shipments/:id` |
| **Expected Result** | - Status: 200<br>- Trả về đầy đủ thông tin: pickup, delivery, COD, tracking |

### TC-SH-013: Không thể xem đơn hàng của shipper khác
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper không thể xem đơn không phải của mình |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/shipments/:id` (ID của shipper khác) |
| **Expected Result** | - Status: 403<br>- Error: "You are not assigned to this shipment" |

---

## 5. Status Updates

### TC-SH-014: Cập nhật trạng thái - Đã lấy hàng (picked_up)
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper xác nhận đã lấy hàng từ shop |
| **Precondition** | Shipment status = 'assigned' |
| **Endpoint** | `POST /api/shipper/shipments/:id/status` |
| **Input** | `{ "status": "picked_up", "location": { "lat": 10.762, "lng": 106.66 } }` |
| **Expected Result** | - Status: 200<br>- Shipment status = 'picked_up'<br>- picked_up_at được set |

### TC-SH-015: Cập nhật trạng thái - Đang giao (delivering)
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper bắt đầu giao hàng |
| **Precondition** | Shipment status = 'picked_up' |
| **Endpoint** | `POST /api/shipper/shipments/:id/status` |
| **Input** | `{ "status": "delivering" }` |
| **Expected Result** | - Status: 200<br>- Shipment status = 'delivering' |

### TC-SH-016: Giao hàng thành công (delivered) - Không COD
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper xác nhận giao hàng thành công (đơn không COD) |
| **Precondition** | Shipment status = 'delivering', cod_amount = 0 |
| **Endpoint** | `POST /api/shipper/shipments/:id/status` |
| **Input** | `{ "status": "delivered", "photoUrl": "https://...", "location": { "lat": 10.762, "lng": 106.66 } }` |
| **Expected Result** | - Status: 200<br>- Shipment status = 'delivered'<br>- delivered_at được set<br>- delivery_photo_url được lưu |

### TC-SH-017: Giao hàng thành công (delivered) - Có COD
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper xác nhận giao hàng và thu COD |
| **Precondition** | Shipment status = 'delivering', cod_amount > 0 |
| **Endpoint** | `POST /api/shipper/shipments/:id/status` |
| **Input** | `{ "status": "delivered", "photoUrl": "https://...", "codCollected": true }` |
| **Expected Result** | - Status: 200<br>- cod_collected = true<br>- Shipper daily_cod_collected được cập nhật |

### TC-SH-018: Giao hàng COD - Thiếu xác nhận thu tiền
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Không thể giao đơn COD mà không xác nhận thu tiền |
| **Precondition** | Shipment có cod_amount > 0 |
| **Endpoint** | `POST /api/shipper/shipments/:id/status` |
| **Input** | `{ "status": "delivered", "photoUrl": "https://..." }` |
| **Expected Result** | - Status: 400<br>- Error code: SHIP_006<br>- Message: "COD collection confirmation is required" |

### TC-SH-019: Giao hàng - Thiếu ảnh xác nhận
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Không thể giao hàng mà không có ảnh |
| **Precondition** | Shipment status = 'delivering' |
| **Endpoint** | `POST /api/shipper/shipments/:id/status` |
| **Input** | `{ "status": "delivered" }` |
| **Expected Result** | - Status: 400<br>- Error code: SHIP_005<br>- Message: "Photo proof is required" |

### TC-SH-020: Giao hàng thất bại (failed)
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper báo giao hàng thất bại |
| **Precondition** | Shipment status = 'delivering' |
| **Endpoint** | `POST /api/shipper/shipments/:id/status` |
| **Input** | `{ "status": "failed", "reason": "customer_not_available" }` |
| **Expected Result** | - Status: 200<br>- Shipment status = 'failed'<br>- failure_reason được lưu<br>- delivery_attempts tăng lên |

### TC-SH-021: Giao hàng thất bại - Lý do không hợp lệ
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Lý do thất bại phải nằm trong danh sách cho phép |
| **Precondition** | Shipment status = 'delivering' |
| **Endpoint** | `POST /api/shipper/shipments/:id/status` |
| **Input** | `{ "status": "failed", "reason": "invalid_reason" }` |
| **Expected Result** | - Status: 400<br>- Error: "Failure reason must be one of: customer_not_available, wrong_address, customer_refused, customer_rescheduled, damaged_package, other" |

### TC-SH-022: Chuyển trạng thái không hợp lệ
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Không thể chuyển từ assigned sang delivered |
| **Precondition** | Shipment status = 'assigned' |
| **Endpoint** | `POST /api/shipper/shipments/:id/status` |
| **Input** | `{ "status": "delivered", "photoUrl": "https://..." }` |
| **Expected Result** | - Status: 400<br>- Error code: SHIP_002<br>- Message: "Cannot transition from assigned to delivered" |

---

## 6. Rejection

### TC-SH-023: Từ chối đơn hàng
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper từ chối đơn hàng đã được assign |
| **Precondition** | Shipment status = 'assigned' |
| **Endpoint** | `POST /api/shipper/shipments/:id/reject` |
| **Input** | `{ "reason": "Quá xa vị trí hiện tại" }` |
| **Expected Result** | - Status: 200<br>- Đơn hàng được đưa vào queue để reassign |

### TC-SH-024: Không thể từ chối đơn đã lấy
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Không thể từ chối sau khi đã picked_up |
| **Precondition** | Shipment status = 'picked_up' |
| **Endpoint** | `POST /api/shipper/shipments/:id/reject` |
| **Input** | `{ "reason": "Lý do" }` |
| **Expected Result** | - Status: 400<br>- Error: "Can only reject shipments that have not been picked up yet" |

---

## 7. Photo Upload

### TC-SH-025: Upload ảnh giao hàng
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Upload ảnh xác nhận giao hàng |
| **Precondition** | Đã đăng nhập, có shipment đang giao |
| **Endpoint** | `POST /api/shipper/upload/photo` |
| **Input** | Form-data: `photo` (file), `shipmentId`, `type: "delivery"` |
| **Expected Result** | - Status: 200<br>- Trả về URL của ảnh đã upload |

### TC-SH-026: Upload ảnh chữ ký
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Upload ảnh chữ ký người nhận |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `POST /api/shipper/upload/photo` |
| **Input** | Form-data: `photo` (file), `shipmentId`, `type: "signature"` |
| **Expected Result** | - Status: 200<br>- Trả về URL của ảnh |

### TC-SH-027: Upload file không phải ảnh
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Chỉ chấp nhận file ảnh |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `POST /api/shipper/upload/photo` |
| **Input** | Form-data: `photo` (file .pdf) |
| **Expected Result** | - Status: 400<br>- Error: "Only image files are allowed" |

---

## 8. Earnings & COD

### TC-SH-028: Xem thu nhập hôm nay
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem tổng thu nhập trong ngày |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/earnings?period=today` |
| **Expected Result** | - Status: 200<br>- Trả về: totalEarnings, totalDeliveries, totalShippingFee, totalCodCollected |

### TC-SH-029: Xem thu nhập theo tuần
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem thu nhập 7 ngày gần nhất |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/earnings?period=week` |
| **Expected Result** | - Status: 200<br>- Trả về breakdown theo ngày |

### TC-SH-030: Xem thu nhập theo tháng
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem thu nhập tháng hiện tại |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/earnings?period=month` |
| **Expected Result** | - Status: 200<br>- Trả về tổng hợp cả tháng |

### TC-SH-031: Xem thu nhập theo khoảng thời gian
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem thu nhập theo ngày tùy chọn |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/earnings?startDate=2025-12-01&endDate=2025-12-15` |
| **Expected Result** | - Status: 200<br>- Trả về thu nhập trong khoảng thời gian |

### TC-SH-032: Xem số dư COD trong ngày
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem tổng COD đã thu trong ngày để đối soát |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/cod-balance` |
| **Expected Result** | - Status: 200<br>- Trả về: dailyCodCollected, date |

---

## 9. Dashboard & Statistics

### TC-SH-033: Xem dashboard tổng quan
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem thống kê tổng quan của shipper |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/dashboard` |
| **Expected Result** | - Status: 200<br>- Trả về: shipper info, overall stats, period stats, daily stats |

### TC-SH-034: Xem thống kê chi tiết
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem thống kê chi tiết với breakdown |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/statistics?period=month&breakdown=daily` |
| **Expected Result** | - Status: 200<br>- Trả về: summary, breakdown theo ngày |

### TC-SH-035: Xem thống kê theo tuần
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Xem thống kê breakdown theo tuần |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/statistics?breakdown=weekly&weeks=4` |
| **Expected Result** | - Status: 200<br>- Trả về thống kê 4 tuần gần nhất |

---

## 10. Edge Cases & Error Handling

### TC-SH-036: Truy cập API khi chưa đăng nhập
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Các API yêu cầu authentication |
| **Precondition** | Không có token |
| **Endpoint** | `GET /api/shipper/shipments` |
| **Expected Result** | - Status: 401<br>- Error: "Unauthorized" |

### TC-SH-037: Token hết hạn
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Sử dụng token đã hết hạn |
| **Precondition** | Token expired |
| **Endpoint** | `GET /api/shipper/shipments` |
| **Expected Result** | - Status: 401<br>- Error: "Token expired" |

### TC-SH-038: Shipment không tồn tại
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Truy cập shipment với ID không tồn tại |
| **Precondition** | Đã đăng nhập |
| **Endpoint** | `GET /api/shipper/shipments/invalid-uuid` |
| **Expected Result** | - Status: 404<br>- Error: "Shipment not found" |

### TC-SH-039: Shipper chưa được approve
| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Shipper pending không thể nhận đơn |
| **Precondition** | Shipper status = 'pending' |
| **Endpoint** | `POST /api/shippers/:id/online` |
| **Expected Result** | - Status: 400<br>- Error: "Shipper is not active" |

---

## Danh sách lý do giao hàng thất bại hợp lệ

| Code | Mô tả tiếng Việt |
|------|------------------|
| `customer_not_available` | Khách hàng không có mặt |
| `wrong_address` | Sai địa chỉ |
| `customer_refused` | Khách hàng từ chối nhận |
| `customer_rescheduled` | Khách hàng hẹn lại |
| `damaged_package` | Hàng bị hư hỏng |
| `other` | Lý do khác |

---

## Status Transitions hợp lệ

```
assigned → picked_up → delivering → delivered
                                  → failed
```

| From Status | To Status (allowed) |
|-------------|---------------------|
| assigned | picked_up |
| picked_up | delivering |
| delivering | delivered, failed |

---

## Checklist Test

- [ ] TC-SH-001 đến TC-SH-003: Authentication & Profile
- [ ] TC-SH-004 đến TC-SH-006: Online/Offline Status
- [ ] TC-SH-007 đến TC-SH-008: Location Tracking
- [ ] TC-SH-009 đến TC-SH-013: Shipment Management
- [ ] TC-SH-014 đến TC-SH-022: Status Updates
- [ ] TC-SH-023 đến TC-SH-024: Rejection
- [ ] TC-SH-025 đến TC-SH-027: Photo Upload
- [ ] TC-SH-028 đến TC-SH-032: Earnings & COD
- [ ] TC-SH-033 đến TC-SH-035: Dashboard & Statistics
- [ ] TC-SH-036 đến TC-SH-039: Edge Cases & Error Handling
