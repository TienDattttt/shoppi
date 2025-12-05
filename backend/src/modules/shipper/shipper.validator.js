/**
 * Shipper Validators
 * Input validation for shipper module
 * 
 * Requirements: 4 (Shipper Management), 5 (Shipment Management)
 */

const { ValidationError } = require('../../shared/utils/error.util');

// ============================================
// SHIPPER VALIDATORS
// ============================================

/**
 * Validate create shipper input
 * @param {Object} data
 * @throws {ValidationError}
 */
function validateCreateShipper(data) {
  const errors = [];

  // Vehicle type
  const validVehicleTypes = ['motorbike', 'car', 'bicycle', 'truck'];
  if (!data.vehicleType) {
    errors.push('Vehicle type is required');
  } else if (!validVehicleTypes.includes(data.vehicleType)) {
    errors.push(`Vehicle type must be one of: ${validVehicleTypes.join(', ')}`);
  }

  // Vehicle plate
  if (!data.vehiclePlate) {
    errors.push('Vehicle plate is required');
  } else if (data.vehiclePlate.length < 5 || data.vehiclePlate.length > 20) {
    errors.push('Vehicle plate must be between 5 and 20 characters');
  }

  // ID card number (optional but validate if provided)
  if (data.idCardNumber && !/^\d{9,12}$/.test(data.idCardNumber)) {
    errors.push('ID card number must be 9-12 digits');
  }

  // Driver license (optional but validate if provided)
  if (data.driverLicense && data.driverLicense.length > 50) {
    errors.push('Driver license must be at most 50 characters');
  }

  // Working area (optional)
  if (data.workingCity && data.workingCity.length > 100) {
    errors.push('Working city must be at most 100 characters');
  }
  if (data.workingDistrict && data.workingDistrict.length > 100) {
    errors.push('Working district must be at most 100 characters');
  }

  // Max distance
  if (data.maxDistanceKm !== undefined) {
    const maxDist = parseFloat(data.maxDistanceKm);
    if (isNaN(maxDist) || maxDist < 1 || maxDist > 50) {
      errors.push('Max distance must be between 1 and 50 km');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }
}

/**
 * Validate update shipper input
 * @param {Object} data
 * @throws {ValidationError}
 */
function validateUpdateShipper(data) {
  const errors = [];

  // Vehicle type (optional)
  if (data.vehicleType) {
    const validVehicleTypes = ['motorbike', 'car', 'bicycle', 'truck'];
    if (!validVehicleTypes.includes(data.vehicleType)) {
      errors.push(`Vehicle type must be one of: ${validVehicleTypes.join(', ')}`);
    }
  }

  // Vehicle plate (optional)
  if (data.vehiclePlate) {
    if (data.vehiclePlate.length < 5 || data.vehiclePlate.length > 20) {
      errors.push('Vehicle plate must be between 5 and 20 characters');
    }
  }

  // Max distance (optional)
  if (data.maxDistanceKm !== undefined) {
    const maxDist = parseFloat(data.maxDistanceKm);
    if (isNaN(maxDist) || maxDist < 1 || maxDist > 50) {
      errors.push('Max distance must be between 1 and 50 km');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }
}

/**
 * Validate location input
 * @param {Object} data
 * @throws {ValidationError}
 */
function validateLocation(data) {
  const errors = [];

  if (data.lat === undefined || data.lat === null) {
    errors.push('Latitude is required');
  } else {
    const lat = parseFloat(data.lat);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('Latitude must be between -90 and 90');
    }
  }

  if (data.lng === undefined || data.lng === null) {
    errors.push('Longitude is required');
  } else {
    const lng = parseFloat(data.lng);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push('Longitude must be between -180 and 180');
    }
  }

  // Optional accuracy
  if (data.accuracy !== undefined) {
    const accuracy = parseFloat(data.accuracy);
    if (isNaN(accuracy) || accuracy < 0) {
      errors.push('Accuracy must be a positive number');
    }
  }

  // Optional speed
  if (data.speed !== undefined) {
    const speed = parseFloat(data.speed);
    if (isNaN(speed) || speed < 0) {
      errors.push('Speed must be a positive number');
    }
  }

  // Optional heading
  if (data.heading !== undefined) {
    const heading = parseFloat(data.heading);
    if (isNaN(heading) || heading < 0 || heading > 360) {
      errors.push('Heading must be between 0 and 360');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }
}

// ============================================
// SHIPMENT VALIDATORS
// ============================================

/**
 * Validate create shipment input
 * @param {Object} data
 * @throws {ValidationError}
 */
function validateCreateShipment(data) {
  const errors = [];

  // Sub-order ID
  if (!data.subOrderId) {
    errors.push('Sub-order ID is required');
  }

  // Pickup address
  if (!data.pickupAddress) {
    errors.push('Pickup address is required');
  }

  // Delivery address
  if (!data.deliveryAddress) {
    errors.push('Delivery address is required');
  }

  // Delivery contact
  if (!data.deliveryContactName) {
    errors.push('Delivery contact name is required');
  }
  if (!data.deliveryContactPhone) {
    errors.push('Delivery contact phone is required');
  } else if (!/^0\d{9,10}$/.test(data.deliveryContactPhone)) {
    errors.push('Invalid delivery contact phone format');
  }

  // Shipping fee (optional)
  if (data.shippingFee !== undefined) {
    const fee = parseFloat(data.shippingFee);
    if (isNaN(fee) || fee < 0) {
      errors.push('Shipping fee must be a positive number');
    }
  }

  // COD amount (optional)
  if (data.codAmount !== undefined) {
    const cod = parseFloat(data.codAmount);
    if (isNaN(cod) || cod < 0) {
      errors.push('COD amount must be a positive number');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }
}

/**
 * Validate shipment status update
 * @param {Object} data
 * @throws {ValidationError}
 */
function validateStatusUpdate(data) {
  const errors = [];

  const validStatuses = [
    'created', 'assigned', 'picked_up', 'delivering',
    'delivered', 'failed', 'cancelled', 'returned'
  ];

  if (!data.status) {
    errors.push('Status is required');
  } else if (!validStatuses.includes(data.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  // Failure reason required for failed status
  if (data.status === 'failed' && !data.failureReason) {
    errors.push('Failure reason is required when marking as failed');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }
}

/**
 * Validate shipment rating
 * @param {Object} data
 * @throws {ValidationError}
 */
function validateRating(data) {
  const errors = [];

  if (data.rating === undefined || data.rating === null) {
    errors.push('Rating is required');
  } else {
    const rating = parseInt(data.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }
  }

  // Feedback (optional)
  if (data.feedback && data.feedback.length > 500) {
    errors.push('Feedback must be at most 500 characters');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }
}

// ============================================
// QUERY VALIDATORS
// ============================================

/**
 * Validate pagination params
 * @param {Object} query
 * @returns {Object} Sanitized pagination
 */
function validatePagination(query) {
  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || 20;

  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  return { page, limit };
}

/**
 * Validate nearby search params
 * @param {Object} query
 * @throws {ValidationError}
 * @returns {Object} Sanitized params
 */
function validateNearbySearch(query) {
  const errors = [];

  const lat = parseFloat(query.lat);
  const lng = parseFloat(query.lng);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    errors.push('Valid latitude is required');
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    errors.push('Valid longitude is required');
  }

  let radiusKm = parseFloat(query.radius) || 5;
  if (radiusKm < 1) radiusKm = 1;
  if (radiusKm > 50) radiusKm = 50;

  let limit = parseInt(query.limit) || 10;
  if (limit < 1) limit = 1;
  if (limit > 50) limit = 50;

  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }

  return { lat, lng, radiusKm, limit };
}

module.exports = {
  // Shipper validators
  validateCreateShipper,
  validateUpdateShipper,
  validateLocation,
  
  // Shipment validators
  validateCreateShipment,
  validateStatusUpdate,
  validateRating,
  
  // Query validators
  validatePagination,
  validateNearbySearch,
};
