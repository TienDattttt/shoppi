/**
 * Google Maps API Client
 * For geocoding, distance calculation, and routing
 */

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api';

/**
 * Make request to Google Maps API
 * @param {string} endpoint - API endpoint
 * @param {object} params - Query parameters
 * @returns {Promise<object>}
 */
async function makeRequest(endpoint, params) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  const url = new URL(`${BASE_URL}/${endpoint}/json`);
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY);
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  }

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Maps API error:', data.status, data.error_message);
    }
    
    return data;
  } catch (error) {
    console.error('Google Maps API request failed:', error.message);
    throw error;
  }
}

/**
 * Geocode address to coordinates
 * @param {string} address - Address string
 * @returns {Promise<{lat: number, lng: number, formattedAddress: string}|null>}
 */
async function geocode(address) {
  const data = await makeRequest('geocode', { address });
  
  if (!data || data.status !== 'OK' || !data.results?.length) {
    return null;
  }

  const result = data.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
  };
}

/**
 * Reverse geocode coordinates to address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{address: string, components: object}|null>}
 */
async function reverseGeocode(lat, lng) {
  const data = await makeRequest('geocode', { latlng: `${lat},${lng}` });
  
  if (!data || data.status !== 'OK' || !data.results?.length) {
    return null;
  }

  const result = data.results[0];
  const components = {};
  
  for (const component of result.address_components) {
    for (const type of component.types) {
      components[type] = component.long_name;
    }
  }

  return {
    address: result.formatted_address,
    placeId: result.place_id,
    components,
  };
}

/**
 * Calculate distance and duration between two points
 * @param {object} origin - {lat, lng} or address string
 * @param {object} destination - {lat, lng} or address string
 * @param {string} mode - 'driving', 'walking', 'bicycling', 'transit'
 * @returns {Promise<{distance: {value: number, text: string}, duration: {value: number, text: string}}|null>}
 */
async function getDistance(origin, destination, mode = 'driving') {
  const originStr = typeof origin === 'string' 
    ? origin 
    : `${origin.lat},${origin.lng}`;
  const destStr = typeof destination === 'string' 
    ? destination 
    : `${destination.lat},${destination.lng}`;

  const data = await makeRequest('distancematrix', {
    origins: originStr,
    destinations: destStr,
    mode,
    language: 'vi',
  });

  if (!data || data.status !== 'OK') {
    return null;
  }

  const element = data.rows[0]?.elements[0];
  if (!element || element.status !== 'OK') {
    return null;
  }

  return {
    distance: element.distance, // { value: meters, text: "5.2 km" }
    duration: element.duration, // { value: seconds, text: "15 mins" }
  };
}


/**
 * Get directions between two points
 * @param {object} origin - {lat, lng} or address string
 * @param {object} destination - {lat, lng} or address string
 * @param {object} options - Additional options
 * @returns {Promise<object|null>}
 */
async function getDirections(origin, destination, options = {}) {
  const originStr = typeof origin === 'string' 
    ? origin 
    : `${origin.lat},${origin.lng}`;
  const destStr = typeof destination === 'string' 
    ? destination 
    : `${destination.lat},${destination.lng}`;

  const data = await makeRequest('directions', {
    origin: originStr,
    destination: destStr,
    mode: options.mode || 'driving',
    language: 'vi',
    alternatives: options.alternatives || false,
    waypoints: options.waypoints?.join('|'),
    optimize: options.optimize || false,
  });

  if (!data || data.status !== 'OK' || !data.routes?.length) {
    return null;
  }

  const route = data.routes[0];
  return {
    distance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
    duration: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0),
    distanceText: route.legs.map(leg => leg.distance.text).join(' + '),
    durationText: route.legs.map(leg => leg.duration.text).join(' + '),
    polyline: route.overview_polyline.points,
    steps: route.legs.flatMap(leg => leg.steps.map(step => ({
      instruction: step.html_instructions,
      distance: step.distance,
      duration: step.duration,
      startLocation: step.start_location,
      endLocation: step.end_location,
    }))),
  };
}

/**
 * Search for places nearby
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {object} options - Search options
 * @returns {Promise<object[]>}
 */
async function searchNearby(lat, lng, options = {}) {
  const data = await makeRequest('place/nearbysearch', {
    location: `${lat},${lng}`,
    radius: options.radius || 1000,
    type: options.type,
    keyword: options.keyword,
    language: 'vi',
  });

  if (!data || data.status !== 'OK') {
    return [];
  }

  return data.results.map(place => ({
    placeId: place.place_id,
    name: place.name,
    address: place.vicinity,
    location: place.geometry.location,
    rating: place.rating,
    types: place.types,
    isOpen: place.opening_hours?.open_now,
  }));
}

/**
 * Get place details
 * @param {string} placeId - Google Place ID
 * @returns {Promise<object|null>}
 */
async function getPlaceDetails(placeId) {
  const data = await makeRequest('place/details', {
    place_id: placeId,
    fields: 'name,formatted_address,geometry,formatted_phone_number,opening_hours,rating,reviews,website',
    language: 'vi',
  });

  if (!data || data.status !== 'OK') {
    return null;
  }

  const place = data.result;
  return {
    placeId,
    name: place.name,
    address: place.formatted_address,
    location: place.geometry.location,
    phone: place.formatted_phone_number,
    website: place.website,
    rating: place.rating,
    openingHours: place.opening_hours?.weekday_text,
    isOpen: place.opening_hours?.open_now,
  };
}

/**
 * Autocomplete address input
 * @param {string} input - User input
 * @param {object} options - Options
 * @returns {Promise<object[]>}
 */
async function autocomplete(input, options = {}) {
  const data = await makeRequest('place/autocomplete', {
    input,
    types: options.types || 'address',
    components: options.country ? `country:${options.country}` : 'country:vn',
    language: 'vi',
  });

  if (!data || data.status !== 'OK') {
    return [];
  }

  return data.predictions.map(prediction => ({
    placeId: prediction.place_id,
    description: prediction.description,
    mainText: prediction.structured_formatting.main_text,
    secondaryText: prediction.structured_formatting.secondary_text,
  }));
}

/**
 * Calculate shipping distance for delivery
 * @param {object} shopLocation - Shop coordinates
 * @param {object} deliveryLocation - Delivery coordinates
 * @returns {Promise<{distanceKm: number, durationMinutes: number, fee: number}>}
 */
async function calculateDeliveryDistance(shopLocation, deliveryLocation) {
  const result = await getDistance(shopLocation, deliveryLocation, 'driving');
  
  if (!result) {
    // Fallback to Haversine formula
    const distanceKm = haversineDistance(shopLocation, deliveryLocation);
    return {
      distanceKm,
      durationMinutes: Math.ceil(distanceKm * 3), // Estimate 3 min/km
      fee: calculateDeliveryFee(distanceKm),
    };
  }

  const distanceKm = result.distance.value / 1000;
  const durationMinutes = Math.ceil(result.duration.value / 60);

  return {
    distanceKm,
    durationMinutes,
    distanceText: result.distance.text,
    durationText: result.duration.text,
    fee: calculateDeliveryFee(distanceKm),
  };
}

/**
 * Haversine formula for distance calculation (fallback)
 */
function haversineDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Calculate delivery fee based on distance
 */
function calculateDeliveryFee(distanceKm) {
  const BASE_FEE = 15000; // 15,000 VND
  const RATE_PER_KM = 3000; // 3,000 VND/km
  const FREE_THRESHOLD = 500000; // Free for orders > 500k
  
  if (distanceKm <= 2) {
    return BASE_FEE;
  }
  
  return Math.round(BASE_FEE + (distanceKm - 2) * RATE_PER_KM);
}

/**
 * Check if API is available
 */
function isAvailable() {
  return !!GOOGLE_MAPS_API_KEY;
}

module.exports = {
  // Geocoding
  geocode,
  reverseGeocode,
  
  // Distance & Directions
  getDistance,
  getDirections,
  calculateDeliveryDistance,
  
  // Places
  searchNearby,
  getPlaceDetails,
  autocomplete,
  
  // Utilities
  haversineDistance,
  calculateDeliveryFee,
  isAvailable,
};
