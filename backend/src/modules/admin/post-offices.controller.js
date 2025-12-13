/**
 * Admin Post Offices Controller
 * Quản lý bưu cục và kho trung chuyển
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const assignmentService = require('../shipper/assignment.service');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');
const { v4: uuidv4 } = require('uuid');

// ============================================
// POST OFFICES CRUD
// ============================================

/**
 * Lấy danh sách bưu cục
 * GET /api/admin/post-offices
 */
async function getPostOffices(req, res) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      city, 
      district, 
      region, 
      office_type,
      search 
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('post_offices')
      .select('*', { count: 'exact' });

    // Filters
    if (city) query = query.eq('city', city);
    if (district) query = query.eq('district', district);
    if (region) query = query.eq('region', region);
    if (office_type) query = query.eq('office_type', office_type);
    if (search) {
      query = query.or(`name.ilike.%${search}%,name_vi.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return sendSuccess(res, {
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return sendError(res, 'QUERY_ERROR', error.message, 500);
  }
}

/**
 * Lấy chi tiết bưu cục
 * GET /api/admin/post-offices/:id
 */
async function getPostOfficeById(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('post_offices')
      .select(`
        *,
        parent:post_offices!parent_office_id(id, code, name_vi)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return sendError(res, 'NOT_FOUND', 'Bưu cục không tồn tại', 404);
    }

    // Đếm số shipper
    const { count: shipperCount } = await supabaseAdmin
      .from('shippers')
      .select('*', { count: 'exact', head: true })
      .eq('post_office_id', id);

    return sendSuccess(res, {
      data: {
        ...data,
        shipperCount: shipperCount || 0,
      },
    });
  } catch (error) {
    return sendError(res, 'QUERY_ERROR', error.message, 500);
  }
}

/**
 * Lấy thống kê bưu cục
 * GET /api/admin/post-offices/:id/stats
 */
async function getPostOfficeStats(req, res) {
  try {
    const { id } = req.params;
    const stats = await assignmentService.getPostOfficeStats(id);
    return sendSuccess(res, { data: stats });
  } catch (error) {
    return sendError(res, error.code || 'ERROR', error.message, error.status || 500);
  }
}

/**
 * Tạo bưu cục mới
 * POST /api/admin/post-offices
 */
async function createPostOffice(req, res) {
  try {
    const {
      code,
      name,
      name_vi,
      address,
      district,
      city,
      region,
      lat,
      lng,
      office_type,
      parent_office_id,
      phone,
    } = req.body;

    // Validate required fields
    if (!code || !name_vi || !address || !office_type) {
      return sendError(res, 'VALIDATION_ERROR', 'Thiếu thông tin bắt buộc', 400);
    }

    // Check duplicate code
    const { data: existing } = await supabaseAdmin
      .from('post_offices')
      .select('id')
      .eq('code', code)
      .single();

    if (existing) {
      return sendError(res, 'DUPLICATE_CODE', 'Mã bưu cục đã tồn tại', 400);
    }

    const { data, error } = await supabaseAdmin
      .from('post_offices')
      .insert({
        id: uuidv4(),
        code,
        name: name || name_vi,
        name_vi,
        address,
        district,
        city,
        region,
        lat,
        lng,
        office_type,
        parent_office_id,
        phone,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return sendSuccess(res, {
      message: 'Tạo bưu cục thành công',
      data,
    }, 201);
  } catch (error) {
    return sendError(res, 'CREATE_ERROR', error.message, 500);
  }
}

/**
 * Cập nhật bưu cục
 * PATCH /api/admin/post-offices/:id
 */
async function updatePostOffice(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabaseAdmin
      .from('post_offices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return sendSuccess(res, {
      message: 'Cập nhật bưu cục thành công',
      data,
    });
  } catch (error) {
    return sendError(res, 'UPDATE_ERROR', error.message, 500);
  }
}

/**
 * Xóa bưu cục
 * DELETE /api/admin/post-offices/:id
 */
async function deletePostOffice(req, res) {
  try {
    const { id } = req.params;

    // Check if has shippers
    const { count } = await supabaseAdmin
      .from('shippers')
      .select('*', { count: 'exact', head: true })
      .eq('post_office_id', id);

    if (count > 0) {
      return sendError(res, 'HAS_SHIPPERS', 'Không thể xóa bưu cục đang có shipper', 400);
    }

    const { error } = await supabaseAdmin
      .from('post_offices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return sendSuccess(res, { message: 'Xóa bưu cục thành công' });
  } catch (error) {
    return sendError(res, 'DELETE_ERROR', error.message, 500);
  }
}

// ============================================
// SHIPPER MANAGEMENT
// ============================================

/**
 * Lấy danh sách shipper của bưu cục
 * GET /api/admin/post-offices/:id/shippers
 */
async function getPostOfficeShippers(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('shippers')
      .select(`
        *,
        user:users(id, full_name, phone, email, avatar_url)
      `, { count: 'exact' })
      .eq('post_office_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return sendSuccess(res, {
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return sendError(res, 'QUERY_ERROR', error.message, 500);
  }
}

/**
 * Gán shipper vào bưu cục
 * POST /api/admin/post-offices/:id/shippers
 */
async function assignShipperToPostOffice(req, res) {
  try {
    const { id } = req.params;
    const { shipper_id } = req.body;

    if (!shipper_id) {
      return sendError(res, 'VALIDATION_ERROR', 'Thiếu shipper_id', 400);
    }

    // Check shipper exists
    const { data: shipper, error: shipperError } = await supabaseAdmin
      .from('shippers')
      .select('id, post_office_id')
      .eq('id', shipper_id)
      .single();

    if (shipperError || !shipper) {
      return sendError(res, 'NOT_FOUND', 'Shipper không tồn tại', 404);
    }

    if (shipper.post_office_id) {
      return sendError(res, 'ALREADY_ASSIGNED', 'Shipper đã thuộc bưu cục khác', 400);
    }

    // Assign
    const { data, error } = await supabaseAdmin
      .from('shippers')
      .update({ post_office_id: id })
      .eq('id', shipper_id)
      .select()
      .single();

    if (error) throw error;

    return sendSuccess(res, {
      message: 'Gán shipper vào bưu cục thành công',
      data,
    });
  } catch (error) {
    return sendError(res, 'UPDATE_ERROR', error.message, 500);
  }
}

/**
 * Gỡ shipper khỏi bưu cục
 * DELETE /api/admin/post-offices/:id/shippers/:shipperId
 */
async function removeShipperFromPostOffice(req, res) {
  try {
    const { id, shipperId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('shippers')
      .update({ post_office_id: null })
      .eq('id', shipperId)
      .eq('post_office_id', id)
      .select()
      .single();

    if (error) throw error;

    return sendSuccess(res, {
      message: 'Gỡ shipper khỏi bưu cục thành công',
      data,
    });
  } catch (error) {
    return sendError(res, 'UPDATE_ERROR', error.message, 500);
  }
}

// ============================================
// AUTO ASSIGNMENT
// ============================================

/**
 * Tự động phân công đơn hàng
 * POST /api/admin/post-offices/shipments/:shipmentId/auto-assign
 */
async function autoAssignShipment(req, res) {
  try {
    const { shipmentId } = req.params;
    const result = await assignmentService.autoAssignShipment(shipmentId);

    return sendSuccess(res, {
      message: 'Phân công shipper thành công',
      data: {
        shipmentId: result.id,
        pickupOffice: {
          id: result.pickupOffice.id,
          name: result.pickupOffice.name_vi,
        },
        deliveryOffice: {
          id: result.deliveryOffice.id,
          name: result.deliveryOffice.name_vi,
        },
        pickupShipper: {
          id: result.pickupShipper.id,
          name: result.pickupShipper.user?.full_name,
        },
        deliveryShipper: {
          id: result.deliveryShipper.id,
          name: result.deliveryShipper.user?.full_name,
        },
      },
    });
  } catch (error) {
    return sendError(res, error.code || 'ASSIGN_ERROR', error.message, error.status || 500);
  }
}

/**
 * Reset số đơn hàng ngày
 * POST /api/admin/post-offices/reset-daily-counts
 */
async function resetDailyCounts(req, res) {
  try {
    await assignmentService.resetDailyOrderCounts();
    return sendSuccess(res, { message: 'Reset số đơn hàng ngày thành công' });
  } catch (error) {
    return sendError(res, 'RESET_ERROR', error.message, 500);
  }
}

// ============================================
// ADMINISTRATIVE DIVISIONS
// ============================================

/**
 * Lấy danh sách tỉnh/thành phố
 * GET /api/admin/post-offices/provinces
 */
async function getProvinces(req, res) {
  try {
    const { region } = req.query;
    
    let query = supabaseAdmin
      .from('provinces')
      .select('code, name, full_name, region, lat, lng')
      .order('name');
    
    if (region) {
      query = query.eq('region', region);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return sendSuccess(res, { data });
  } catch (error) {
    return sendError(res, 'QUERY_ERROR', error.message, 500);
  }
}

/**
 * Lấy danh sách xã/phường theo tỉnh
 * GET /api/admin/post-offices/wards
 */
async function getWards(req, res) {
  try {
    const { province_code, ward_type } = req.query;
    
    let query = supabaseAdmin
      .from('wards')
      .select('code, name, province_code, ward_type, lat, lng')
      .order('name');
    
    if (province_code) {
      query = query.eq('province_code', province_code);
    }
    if (ward_type) {
      query = query.eq('ward_type', ward_type);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return sendSuccess(res, { data });
  } catch (error) {
    return sendError(res, 'QUERY_ERROR', error.message, 500);
  }
}

module.exports = {
  getPostOffices,
  getPostOfficeById,
  getPostOfficeStats,
  createPostOffice,
  updatePostOffice,
  deletePostOffice,
  getPostOfficeShippers,
  assignShipperToPostOffice,
  removeShipperFromPostOffice,
  autoAssignShipment,
  resetDailyCounts,
  getProvinces,
  getWards,
};
