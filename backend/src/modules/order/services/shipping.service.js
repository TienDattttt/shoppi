/**
 * Shipping Service
 * Business logic for shipping calculations and management
 * Integrates with Google Maps API for accurate distance calculation
 */

const { AppError } = require('../../../shared/utils/error.util');
const mapsClient = require('../../../shared/google-maps/maps.client');

// Default shipping rates (VND per km)
const SHIPPING_RATES = {
  standard: 3000,
  express: 5000,
};

// Base shipping fee
const BASE_FEE = 15000;

// Free shipping threshold
const FREE_SHIPPING_THRESHOLD = 500000;

/**
 * Calculate shipping fee for a shop's items
 * Uses Google Maps API for accurate distance calculation
 */
async function calculateShippingFee(shopId, addressId, items) {
  // Get shop location from database
  const shopLocation = await getShopLocation(shopId);
  
  // Get delivery address location from database
  const deliveryLocation = await getAddressLocation(addressId);
  
  // Calculate distance using Google Maps API
  let distance;
  let duration;
  
  if (mapsClient.isAvailable()) {
    const result = await mapsClient.calculateDeliveryDistance(shopLocation, deliveryLocation);
    distance = result.distanceKm;
    duration = result.durationMinutes;
  } else {
    // Fallback to Haversine formula
    distance = mapsClient.haversineDistance(shopLocation, deliveryLocation);
    duration = Math.ceil(distance * 3); // Estimate 3 min/km
  }
  
  // Calculate total weight/volume of items
  const totalWeight = items.reduce((sum, item) => {
    const weight = item.product_variants?.weight || 0.5; // Default 0.5kg
    return sum + (weight * item.quantity);
  }, 0);
  
  // Calculate base fee
  let fee = BASE_FEE + (distance * SHIPPING_RATES.standard);
  
  // Add weight surcharge for heavy items
  if (totalWeight > 5) {
    fee += (totalWeight - 5) * 2000; // 2000 VND per kg over 5kg
  }
  
  // Calculate subtotal for free shipping check
  // Note: product_variants uses 'price' column (not 'sale_price')
  const subtotal = items.reduce((sum, item) => {
    const price = item.product_variants?.price || 0;
    return sum + (parseFloat(price) * item.quantity);
  }, 0);
  
  // Free shipping for orders over threshold
  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    fee = 0;
  }
  
  return {
    fee: Math.round(fee),
    distanceKm: distance,
    estimatedMinutes: duration,
  };
}

/**
 * Get shop location from database
 */
async function getShopLocation(shopId) {
  // TODO: Fetch from database
  // For now, return default Ho Chi Minh City location
  return { lat: 10.762622, lng: 106.660172 };
}

/**
 * Get address location from database
 * Uses Google Maps geocoding if coordinates not stored
 */
async function getAddressLocation(addressId) {
  // TODO: Fetch from database
  // If address has no coordinates, geocode it
  return { lat: 10.823099, lng: 106.629664 };
}

/**
 * Geocode address string to coordinates
 */
async function geocodeAddress(addressString) {
  if (!mapsClient.isAvailable()) {
    throw new AppError('Geocoding service not available', 503);
  }
  
  const result = await mapsClient.geocode(addressString);
  if (!result) {
    throw new AppError('Could not geocode address', 400);
  }
  
  return result;
}

/**
 * Get delivery route and directions
 */
async function getDeliveryRoute(shopLocation, deliveryLocation, waypoints = []) {
  if (!mapsClient.isAvailable()) {
    return null;
  }
  
  return mapsClient.getDirections(shopLocation, deliveryLocation, {
    mode: 'driving',
    waypoints,
    optimize: waypoints.length > 0,
  });
}

/**
 * Create shipment for sub-order
 */
async function createShipment(subOrderId, shopLocation, deliveryLocation) {
  // Generate tracking number
  const trackingNumber = generateTrackingNumber();
  
  // Get route info if Google Maps available
  let routeInfo = null;
  if (mapsClient.isAvailable() && shopLocation && deliveryLocation) {
    routeInfo = await mapsClient.getDirections(shopLocation, deliveryLocation);
  }
  
  return {
    subOrderId,
    trackingNumber,
    status: 'created',
    estimatedDelivery: getEstimatedDelivery(routeInfo?.durationMinutes),
    route: routeInfo ? {
      distanceKm: routeInfo.distance / 1000,
      durationMinutes: routeInfo.duration / 60,
      polyline: routeInfo.polyline,
    } : null,
  };
}

/**
 * Generate tracking number
 */
function generateTrackingNumber() {
  const prefix = 'VN';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Get estimated delivery date
 * @param {number} deliveryMinutes - Estimated delivery time in minutes
 */
function getEstimatedDelivery(deliveryMinutes) {
  const date = new Date();
  
  if (deliveryMinutes) {
    // Add delivery time + processing time (2 hours)
    date.setMinutes(date.getMinutes() + deliveryMinutes + 120);
  } else {
    // Default 3 days
    date.setDate(date.getDate() + 3);
  }
  
  return date.toISOString();
}

/**
 * Search nearby pickup points
 */
async function searchPickupPoints(lat, lng, radius = 5000) {
  if (!mapsClient.isAvailable()) {
    return [];
  }
  
  return mapsClient.searchNearby(lat, lng, {
    radius,
    type: 'convenience_store',
    keyword: 'pickup point',
  });
}

/**
 * Autocomplete address for user input
 */
async function autocompleteAddress(input) {
  if (!mapsClient.isAvailable()) {
    return [];
  }
  
  return mapsClient.autocomplete(input, {
    types: 'address',
    country: 'vn',
  });
}

module.exports = {
  // Core functions
  calculateShippingFee,
  createShipment,
  generateTrackingNumber,
  getEstimatedDelivery,
  
  // Google Maps integration
  geocodeAddress,
  getDeliveryRoute,
  searchPickupPoints,
  autocompleteAddress,
  
  // Location helpers
  getShopLocation,
  getAddressLocation,
  
  // Constants
  SHIPPING_RATES,
  BASE_FEE,
  FREE_SHIPPING_THRESHOLD,
};
