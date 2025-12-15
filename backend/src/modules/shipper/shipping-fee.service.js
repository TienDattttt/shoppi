/**
 * Shipping Fee Service
 * Business logic for shipping fee calculation
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4 (Shipping Fee Calculation)
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const mapsClient = require('../../shared/google-maps/maps.client');
const { AppError, ValidationError } = require('../../shared/utils/error.util');

// Weight-based surcharge tiers (VND per kg over base weight)
const WEIGHT_SURCHARGE = {
  baseWeight: 2, // First 2kg included in base fee
  perKgFee: 5000, // 5,000 VND per additional kg
};

// Special handling surcharge
const SPECIAL_HANDLING_SURCHARGE = 10000; // 10,000 VND

/**
 * Get all active shipping zones
 * @returns {Promise<Object[]>}
 */
async function getShippingZones() {
  const { data, error } = await supabaseAdmin
    .from('shipping_zones')
    .select('*')
    .eq('is_active', true)
    .order('base_fee', { ascending: true });

  if (error) {
    throw new AppError('QUERY_ERROR', `Failed to get shipping zones: ${error.message}`, 500);
  }

  return data || [];
}

/**
 * Get shipping zone by type
 * @param {string} zoneType
 * @returns {Promise<Object|null>}
 */
async function getZoneByType(zoneType) {
  const { data, error } = await supabaseAdmin
    .from('shipping_zones')
    .select('*')
    .eq('zone_type', zoneType)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new AppError('QUERY_ERROR', `Failed to get shipping zone: ${error.message}`, 500);
  }

  return data || null;
}

/**
 * Determine zone type from two addresses using coordinates
 * Requirements: 11.2 - Zone-based pricing (same district, same city, different city)
 * 
 * @param {Object} fromAddress - { lat, lng, provinceCode?, wardCode? }
 * @param {Object} toAddress - { lat, lng, provinceCode?, wardCode? }
 * @returns {Promise<string>} - Zone type
 */
async function determineZoneType(fromAddress, toAddress) {
  // If we have province/ward codes, use them directly
  if (fromAddress.provinceCode && toAddress.provinceCode) {
    return determineZoneFromCodes(fromAddress, toAddress);
  }

  // Otherwise, try to reverse geocode to get administrative info
  const [fromGeo, toGeo] = await Promise.all([
    getAddressInfo(fromAddress),
    getAddressInfo(toAddress),
  ]);

  if (!fromGeo || !toGeo) {
    // Fallback to distance-based zone determination
    return determineZoneFromDistance(fromAddress, toAddress);
  }

  return determineZoneFromCodes(fromGeo, toGeo);
}

/**
 * Determine zone from administrative codes
 * @param {Object} from - { provinceCode, wardCode }
 * @param {Object} to - { provinceCode, wardCode }
 * @returns {string}
 */
function determineZoneFromCodes(from, to) {
  // Same ward = same district
  if (from.wardCode && to.wardCode && from.wardCode === to.wardCode) {
    return 'same_district';
  }

  // Same province = same city
  if (from.provinceCode === to.provinceCode) {
    return 'same_city';
  }

  // Check if same region
  // We need to query the provinces table to get regions
  return 'different_region'; // Default, will be refined below
}

/**
 * Determine zone from distance (fallback)
 * @param {Object} from - { lat, lng }
 * @param {Object} to - { lat, lng }
 * @returns {string}
 */
function determineZoneFromDistance(from, to) {
  const distanceKm = mapsClient.haversineDistance(from, to);

  if (distanceKm <= 5) {
    return 'same_district';
  } else if (distanceKm <= 30) {
    return 'same_city';
  } else if (distanceKm <= 200) {
    return 'same_region';
  } else {
    return 'different_region';
  }
}

/**
 * Get address administrative info from coordinates
 * @param {Object} address - { lat, lng }
 * @returns {Promise<Object|null>}
 */
async function getAddressInfo(address) {
  if (address.provinceCode) {
    return address;
  }

  // Try to find nearest ward from database
  const { data, error } = await supabaseAdmin
    .from('wards')
    .select('code, province_code')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(1);

  // For now, return null and use distance-based fallback
  // In production, you'd implement proper reverse geocoding
  return null;
}

/**
 * Get province regions for zone determination
 * @param {string} provinceCode1
 * @param {string} provinceCode2
 * @returns {Promise<boolean>} - True if same region
 */
async function isSameRegion(provinceCode1, provinceCode2) {
  const { data, error } = await supabaseAdmin
    .from('provinces')
    .select('code, region')
    .in('code', [provinceCode1, provinceCode2]);

  if (error || !data || data.length !== 2) {
    return false;
  }

  return data[0].region === data[1].region;
}

/**
 * Calculate shipping fee
 * Requirements: 11.1, 11.2, 11.3, 11.4
 * 
 * @param {Object} params
 * @param {Object} params.fromAddress - Pickup address { lat, lng, address?, provinceCode?, wardCode? }
 * @param {Object} params.toAddress - Delivery address { lat, lng, address?, provinceCode?, wardCode? }
 * @param {number} params.weight - Package weight in kg (optional)
 * @param {boolean} params.specialHandling - Requires special handling (optional)
 * @param {number} params.discount - Discount amount in VND (optional)
 * @returns {Promise<Object>} - Fee calculation result
 */
async function calculateShippingFee(params) {
  const { fromAddress, toAddress, weight = 0, specialHandling = false, discount = 0 } = params;

  // Validate addresses
  if (!fromAddress || !fromAddress.lat || !fromAddress.lng) {
    throw new ValidationError('From address with coordinates is required');
  }
  if (!toAddress || !toAddress.lat || !toAddress.lng) {
    throw new ValidationError('To address with coordinates is required');
  }

  // Determine zone type
  const zoneType = await determineZoneType(fromAddress, toAddress);

  // Get zone pricing
  const zone = await getZoneByType(zoneType);
  if (!zone) {
    throw new AppError('FEE_002', `Shipping zone not supported: ${zoneType}`, 400);
  }

  // Calculate distance
  let distanceKm = mapsClient.haversineDistance(fromAddress, toAddress);
  let distanceText = `${distanceKm.toFixed(1)} km`;
  let durationMinutes = Math.ceil(distanceKm * 3); // Estimate 3 min/km

  // Try to get actual distance from Google Maps
  try {
    const distanceResult = await mapsClient.getDistance(fromAddress, toAddress, 'driving');
    if (distanceResult) {
      distanceKm = distanceResult.distance.value / 1000;
      distanceText = distanceResult.distance.text;
      durationMinutes = Math.ceil(distanceResult.duration.value / 60);
    }
  } catch (e) {
    console.warn('Failed to get Google Maps distance, using Haversine:', e.message);
  }

  // Calculate fees
  const baseFee = parseFloat(zone.base_fee);
  const perKmFee = parseFloat(zone.per_km_fee || 0);
  const distanceFee = Math.round(distanceKm * perKmFee);

  // Weight surcharge
  let weightFee = 0;
  if (weight > WEIGHT_SURCHARGE.baseWeight) {
    const extraWeight = weight - WEIGHT_SURCHARGE.baseWeight;
    weightFee = Math.round(extraWeight * WEIGHT_SURCHARGE.perKgFee);
  }

  // Special handling surcharge
  const surcharge = specialHandling ? SPECIAL_HANDLING_SURCHARGE : 0;

  // Calculate totals
  const originalFee = baseFee + distanceFee + weightFee + surcharge;
  const discountAmount = Math.min(discount, originalFee); // Can't discount more than total
  const fee = originalFee - discountAmount;

  return {
    fee: Math.round(fee),
    originalFee: Math.round(originalFee),
    discount: Math.round(discountAmount),
    zoneType,
    estimatedDays: zone.estimated_days,
    breakdown: {
      baseFee: Math.round(baseFee),
      distanceFee: Math.round(distanceFee),
      weightFee: Math.round(weightFee),
      surcharge: Math.round(surcharge),
    },
    distance: {
      km: Math.round(distanceKm * 10) / 10,
      text: distanceText,
    },
    duration: {
      minutes: durationMinutes,
      text: `${durationMinutes} phút`,
    },
  };
}

/**
 * Calculate shipping fee with free shipping threshold
 * @param {Object} params - Same as calculateShippingFee
 * @param {number} orderTotal - Order total amount
 * @param {number} freeShippingThreshold - Threshold for free shipping
 * @returns {Promise<Object>}
 */
async function calculateShippingFeeWithThreshold(params, orderTotal, freeShippingThreshold = 500000) {
  const result = await calculateShippingFee(params);

  if (orderTotal >= freeShippingThreshold) {
    return {
      ...result,
      fee: 0,
      discount: result.originalFee,
      freeShipping: true,
      freeShippingReason: `Miễn phí vận chuyển cho đơn hàng từ ${freeShippingThreshold.toLocaleString('vi-VN')}đ`,
    };
  }

  return {
    ...result,
    freeShipping: false,
  };
}

module.exports = {
  getShippingZones,
  getZoneByType,
  determineZoneType,
  calculateShippingFee,
  calculateShippingFeeWithThreshold,
  // Export for testing
  determineZoneFromDistance,
  WEIGHT_SURCHARGE,
  SPECIAL_HANDLING_SURCHARGE,
};
