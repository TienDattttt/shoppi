/**
 * Admin Post Offices Routes
 * Quản lý bưu cục và kho trung chuyển
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../auth/auth.middleware');
const postOfficesController = require('./post-offices.controller');

// Tất cả routes yêu cầu admin
router.use(authenticate);
router.use(authorize('admin'));

// ============================================
// ADMINISTRATIVE DIVISIONS (đặt trước để không bị match với /:id)
// ============================================

// Danh sách tỉnh/thành phố
router.get('/provinces', postOfficesController.getProvinces);

// Danh sách xã/phường
router.get('/wards', postOfficesController.getWards);

// ============================================
// POST OFFICES CRUD
// ============================================

// Danh sách bưu cục
router.get('/', postOfficesController.getPostOffices);

// Chi tiết bưu cục (bao gồm shipper)
router.get('/:id', postOfficesController.getPostOfficeById);

// Thống kê bưu cục
router.get('/:id/stats', postOfficesController.getPostOfficeStats);

// Tạo bưu cục mới
router.post('/', postOfficesController.createPostOffice);

// Cập nhật bưu cục
router.patch('/:id', postOfficesController.updatePostOffice);

// Xóa bưu cục
router.delete('/:id', postOfficesController.deletePostOffice);

// ============================================
// SHIPPER MANAGEMENT BY POST OFFICE
// ============================================

// Danh sách shipper của bưu cục
router.get('/:id/shippers', postOfficesController.getPostOfficeShippers);

// Gán shipper vào bưu cục
router.post('/:id/shippers', postOfficesController.assignShipperToPostOffice);

// Gỡ shipper khỏi bưu cục
router.delete('/:id/shippers/:shipperId', postOfficesController.removeShipperFromPostOffice);

// ============================================
// AUTO ASSIGNMENT
// ============================================

// Tự động phân công đơn hàng
router.post('/shipments/:shipmentId/auto-assign', postOfficesController.autoAssignShipment);

// Reset số đơn hàng ngày
router.post('/reset-daily-counts', postOfficesController.resetDailyCounts);

module.exports = router;
