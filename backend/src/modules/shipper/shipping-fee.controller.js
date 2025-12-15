/**
 * Shipping Fee Controller
 * HTTP handlers for shipping fee calculation
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4 (Shipping Fee Calculation)
 */

const shippingFeeService = require('./shipping-fee.service');
const { sendSuccess: successResponse, sendError } = require('../../shared/utils/response.util');

// Helper to handle errors consistently
const errorResponse = (res, error) => {
  const statusCode = error.status || error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.message || 'An error occurred';
  return sendError(res, code, message, statusCode);
};

/**
 * Calculate shipping fee
 * POST /api/shipping/calculate
 * 
 * Requirements: 11.1 - Calculate shipping fee based on distance and package weight
 * Requirements: 11.2 - Apply zone-based pricing (same district, same city, different city)
 * Requirements: 11.3 - Display original fee with discount applied
 * Requirements: 11.4 - Add surcharge for special handling
 * 
 * @param {Object} req.body.fromAddress - Pickup address { lat, lng, address?, provinceCode?, wardCode? }
 * @param {Object} req.body.toAddress - Delivery address { lat, lng, address?, provinceCode?, wardCode? }
 * @param {number} req.body.weight - Package weight in kg (optional)
 * @param {boolean} req.body.specialHandling - Requires special handling (optional)
 * @param {number} req.body.discount - Discount amount in VND (optional)
 */
async function calculateShippingFee(req, res) {
  try {
    const { fromAddress, toAddress, weight, specialHandling, discount } = req.body;

    // Validate required fields
    if (!fromAddress) {
      return errorResponse(res, { 
        code: 'FEE_001', 
        message: 'Địa chỉ lấy hàng là bắt buộc', 
        status: 400 
      });
    }
    if (!toAddress) {
      return errorResponse(res, { 
        code: 'FEE_001', 
        message: 'Địa chỉ giao hàng là bắt buộc', 
        status: 400 
      });
    }

    // Validate coordinates
    if (!fromAddress.lat || !fromAddress.lng) {
      return errorResponse(res, { 
        code: 'FEE_001', 
        message: 'Tọa độ địa chỉ lấy hàng không hợp lệ', 
        status: 400 
      });
    }
    if (!toAddress.lat || !toAddress.lng) {
      return errorResponse(res, { 
        code: 'FEE_001', 
        message: 'Tọa độ địa chỉ giao hàng không hợp lệ', 
        status: 400 
      });
    }

    const result = await shippingFeeService.calculateShippingFee({
      fromAddress: {
        lat: parseFloat(fromAddress.lat),
        lng: parseFloat(fromAddress.lng),
        address: fromAddress.address,
        provinceCode: fromAddress.provinceCode,
        wardCode: fromAddress.wardCode,
      },
      toAddress: {
        lat: parseFloat(toAddress.lat),
        lng: parseFloat(toAddress.lng),
        address: toAddress.address,
        provinceCode: toAddress.provinceCode,
        wardCode: toAddress.wardCode,
      },
      weight: weight ? parseFloat(weight) : 0,
      specialHandling: specialHandling === true,
      discount: discount ? parseFloat(discount) : 0,
    });

    return successResponse(res, {
      data: {
        fee: result.fee,
        originalFee: result.originalFee,
        discount: result.discount,
        zoneType: result.zoneType,
        zoneLabel: getZoneLabel(result.zoneType),
        estimatedDays: result.estimatedDays,
        estimatedDelivery: getEstimatedDeliveryText(result.estimatedDays),
        breakdown: result.breakdown,
        distance: result.distance,
        duration: result.duration,
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get all shipping zones with pricing
 * GET /api/shipping/zones
 */
async function getShippingZones(req, res) {
  try {
    const zones = await shippingFeeService.getShippingZones();

    return successResponse(res, {
      data: zones.map(zone => ({
        id: zone.id,
        zoneType: zone.zone_type,
        zoneLabel: getZoneLabel(zone.zone_type),
        baseFee: parseFloat(zone.base_fee),
        perKmFee: parseFloat(zone.per_km_fee || 0),
        estimatedDays: zone.estimated_days,
        estimatedDelivery: getEstimatedDeliveryText(zone.estimated_days),
        isActive: zone.is_active,
      })),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get zone label in Vietnamese
 * @param {string} zoneType
 * @returns {string}
 */
function getZoneLabel(zoneType) {
  const labels = {
    same_district: 'Cùng quận/huyện',
    same_city: 'Cùng tỉnh/thành phố',
    same_region: 'Cùng miền',
    different_region: 'Khác miền',
  };
  return labels[zoneType] || zoneType;
}

/**
 * Get estimated delivery text in Vietnamese
 * @param {number} days
 * @returns {string}
 */
function getEstimatedDeliveryText(days) {
  if (days === 1) {
    return 'Giao trong ngày';
  } else if (days === 2) {
    return 'Giao trong 1-2 ngày';
  } else {
    return `Giao trong ${days - 1}-${days} ngày`;
  }
}

module.exports = {
  calculateShippingFee,
  getShippingZones,
};
