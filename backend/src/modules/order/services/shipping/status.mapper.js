/**
 * Shipping Status Mapper
 * Normalizes provider-specific statuses to unified format
 * 
 * Feature: shipping-provider-integration
 * Requirements: 5.3
 */

const { ShippingStatus } = require('./shipping.interface');

/**
 * GHTK status codes to unified status
 */
const GHTK_STATUS_MAP = {
  '-1': ShippingStatus.CANCELLED,
  '1': ShippingStatus.CREATED,
  '2': ShippingStatus.PICKED_UP,
  '3': ShippingStatus.DELIVERING,
  '4': ShippingStatus.DELIVERED,
  '5': ShippingStatus.RETURNED,
  '6': ShippingStatus.RETURNING,
  '7': ShippingStatus.ASSIGNED,
  '8': ShippingStatus.FAILED,
  '9': ShippingStatus.DELIVERING,
  '10': ShippingStatus.RETURNING,
  '11': ShippingStatus.FAILED,
  '12': ShippingStatus.RETURNED,
  '13': ShippingStatus.CANCELLED,
};

/**
 * GHN status codes to unified status
 */
const GHN_STATUS_MAP = {
  'ready_to_pick': ShippingStatus.CREATED,
  'picking': ShippingStatus.ASSIGNED,
  'cancel': ShippingStatus.CANCELLED,
  'money_collect_picking': ShippingStatus.ASSIGNED,
  'picked': ShippingStatus.PICKED_UP,
  'storing': ShippingStatus.PICKED_UP,
  'transporting': ShippingStatus.DELIVERING,
  'sorting': ShippingStatus.DELIVERING,
  'delivering': ShippingStatus.DELIVERING,
  'money_collect_delivering': ShippingStatus.DELIVERING,
  'delivered': ShippingStatus.DELIVERED,
  'delivery_fail': ShippingStatus.FAILED,
  'waiting_to_return': ShippingStatus.RETURNING,
  'return': ShippingStatus.RETURNING,
  'return_transporting': ShippingStatus.RETURNING,
  'return_sorting': ShippingStatus.RETURNING,
  'returning': ShippingStatus.RETURNING,
  'return_fail': ShippingStatus.FAILED,
  'returned': ShippingStatus.RETURNED,
  'exception': ShippingStatus.FAILED,
  'damage': ShippingStatus.FAILED,
  'lost': ShippingStatus.FAILED,
};

/**
 * Viettel Post status codes to unified status
 */
const VTP_STATUS_MAP = {
  '100': ShippingStatus.CREATED,
  '101': ShippingStatus.ASSIGNED,
  '102': ShippingStatus.PICKED_UP,
  '103': ShippingStatus.DELIVERING,
  '104': ShippingStatus.DELIVERING,
  '105': ShippingStatus.DELIVERED,
  '106': ShippingStatus.FAILED,
  '107': ShippingStatus.RETURNING,
  '108': ShippingStatus.RETURNED,
  '109': ShippingStatus.CANCELLED,
  '200': ShippingStatus.FAILED,
  '201': ShippingStatus.FAILED,
  '500': ShippingStatus.CANCELLED,
  '501': ShippingStatus.CANCELLED,
};

/**
 * In-house shipper status to unified status
 */
const INHOUSE_STATUS_MAP = {
  'pending': ShippingStatus.CREATED,
  'assigned': ShippingStatus.ASSIGNED,
  'picked_up': ShippingStatus.PICKED_UP,
  'in_transit': ShippingStatus.DELIVERING,
  'out_for_delivery': ShippingStatus.DELIVERING,
  'delivered': ShippingStatus.DELIVERED,
  'failed': ShippingStatus.FAILED,
  'returned': ShippingStatus.RETURNED,
  'cancelled': ShippingStatus.CANCELLED,
};

/**
 * All provider status maps
 */
const STATUS_MAPS = {
  ghtk: GHTK_STATUS_MAP,
  ghn: GHN_STATUS_MAP,
  viettelpost: VTP_STATUS_MAP,
  vtp: VTP_STATUS_MAP,
  inhouse: INHOUSE_STATUS_MAP,
};

/**
 * Normalize provider status to unified status
 * @param {string} providerCode - Provider code
 * @param {string} providerStatus - Provider-specific status
 * @returns {string} Unified status
 */
function normalizeStatus(providerCode, providerStatus) {
  const statusMap = STATUS_MAPS[providerCode?.toLowerCase()];
  
  if (!statusMap) {
    console.warn(`Unknown provider: ${providerCode}, returning status as-is`);
    return providerStatus;
  }

  const normalizedStatus = statusMap[String(providerStatus)];
  
  if (!normalizedStatus) {
    console.warn(`Unknown status ${providerStatus} for provider ${providerCode}`);
    return ShippingStatus.CREATED; // Default fallback
  }

  return normalizedStatus;
}

/**
 * Get all valid unified statuses
 * @returns {string[]}
 */
function getValidStatuses() {
  return Object.values(ShippingStatus);
}

/**
 * Check if status is a valid unified status
 * @param {string} status
 * @returns {boolean}
 */
function isValidStatus(status) {
  return getValidStatuses().includes(status);
}

/**
 * Get status display text (Vietnamese)
 * @param {string} status - Unified status
 * @returns {string}
 */
function getStatusDisplayText(status) {
  const displayTexts = {
    [ShippingStatus.CREATED]: 'Đã tạo đơn',
    [ShippingStatus.ASSIGNED]: 'Đã phân công',
    [ShippingStatus.PICKED_UP]: 'Đã lấy hàng',
    [ShippingStatus.DELIVERING]: 'Đang giao hàng',
    [ShippingStatus.DELIVERED]: 'Đã giao hàng',
    [ShippingStatus.FAILED]: 'Giao thất bại',
    [ShippingStatus.RETURNED]: 'Đã hoàn hàng',
    [ShippingStatus.RETURNING]: 'Đang hoàn hàng',
    [ShippingStatus.CANCELLED]: 'Đã hủy',
  };

  return displayTexts[status] || status;
}

/**
 * Get status priority for sorting
 * @param {string} status
 * @returns {number}
 */
function getStatusPriority(status) {
  const priorities = {
    [ShippingStatus.CREATED]: 1,
    [ShippingStatus.ASSIGNED]: 2,
    [ShippingStatus.PICKED_UP]: 3,
    [ShippingStatus.DELIVERING]: 4,
    [ShippingStatus.DELIVERED]: 5,
    [ShippingStatus.FAILED]: 6,
    [ShippingStatus.RETURNING]: 7,
    [ShippingStatus.RETURNED]: 8,
    [ShippingStatus.CANCELLED]: 9,
  };

  return priorities[status] || 0;
}

/**
 * Check if status is terminal (no more updates expected)
 * @param {string} status
 * @returns {boolean}
 */
function isTerminalStatus(status) {
  return [
    ShippingStatus.DELIVERED,
    ShippingStatus.RETURNED,
    ShippingStatus.CANCELLED,
  ].includes(status);
}

/**
 * Check if status indicates successful delivery
 * @param {string} status
 * @returns {boolean}
 */
function isSuccessStatus(status) {
  return status === ShippingStatus.DELIVERED;
}

/**
 * Check if status indicates failure
 * @param {string} status
 * @returns {boolean}
 */
function isFailureStatus(status) {
  return [
    ShippingStatus.FAILED,
    ShippingStatus.RETURNED,
    ShippingStatus.CANCELLED,
  ].includes(status);
}

module.exports = {
  // Status maps
  GHTK_STATUS_MAP,
  GHN_STATUS_MAP,
  VTP_STATUS_MAP,
  INHOUSE_STATUS_MAP,
  STATUS_MAPS,
  
  // Functions
  normalizeStatus,
  getValidStatuses,
  isValidStatus,
  getStatusDisplayText,
  getStatusPriority,
  isTerminalStatus,
  isSuccessStatus,
  isFailureStatus,
};
