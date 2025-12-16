/**
 * Goong.io API Client
 * Dịch vụ bản đồ Việt Nam - https://goong.io
 * 
 * APIs:
 * - Autocomplete: Gợi ý địa chỉ khi nhập
 * - Geocode: Chuyển địa chỉ thành tọa độ
 * - Reverse Geocode: Chuyển tọa độ thành địa chỉ
 * - Place Detail: Lấy chi tiết địa điểm
 * - Distance Matrix: Tính khoảng cách
 */

const GOONG_API_KEY = process.env.GOONG_API_KEY;
const GOONG_MAP_KEY = process.env.GOONG_MAP_KEY; // For map tiles (if needed)
const BASE_URL = 'https://rsapi.goong.io';

/**
 * Make request to Goong API
 */
async function makeRequest(endpoint, params = {}) {
  if (!GOONG_API_KEY) {
    console.warn('[Goong] API key not configured');
    return null;
  }

  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.append('api_key', GOONG_API_KEY);
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  }

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.status === 'OK' || data.predictions || data.results || data.result) {
      return data;
    }
    
    console.error('[Goong] API error:', data.status || data.error);
    return null;
  } catch (error) {
    console.error('[Goong] Request failed:', error.message);
    return null;
  }
}

/**
 * Autocomplete địa chỉ
 * @param {string} input - Chuỗi tìm kiếm
 * @param {Object} options - Tùy chọn
 * @param {string} options.location - Tọa độ ưu tiên "lat,lng"
 * @param {number} options.radius - Bán kính tìm kiếm (m)
 * @param {number} options.limit - Số kết quả tối đa
 * @returns {Promise<Array>} Danh sách gợi ý
 */
async function autocomplete(input, options = {}) {
  if (!input || input.length < 2) return [];

  const data = await makeRequest('Place/AutoComplete', {
    input,
    location: options.location,
    radius: options.radius,
    limit: options.limit || 10,
  });

  if (!data?.predictions) return [];

  return data.predictions.map(p => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text || p.description.split(',')[0],
    secondaryText: p.structured_formatting?.secondary_text || '',
    types: p.types || [],
    // Compound info for Vietnam addresses
    compound: p.compound ? {
      district: p.compound.district,
      commune: p.compound.commune,
      province: p.compound.province,
    } : null,
  }));
}

/**
 * Lấy chi tiết địa điểm từ place_id
 * @param {string} placeId - Place ID từ autocomplete
 * @returns {Promise<Object>} Chi tiết địa điểm với tọa độ
 */
async function getPlaceDetail(placeId) {
  if (!placeId) return null;

  const data = await makeRequest('Place/Detail', {
    place_id: placeId,
  });

  if (!data?.result) return null;

  const result = data.result;
  return {
    placeId: result.place_id,
    name: result.name,
    formattedAddress: result.formatted_address,
    lat: result.geometry?.location?.lat,
    lng: result.geometry?.location?.lng,
    // Vietnam specific
    compound: result.compound ? {
      district: result.compound.district,
      commune: result.compound.commune,
      province: result.compound.province,
    } : null,
    // Address components
    addressComponents: result.address_components?.map(c => ({
      longName: c.long_name,
      shortName: c.short_name,
    })) || [],
  };
}

/**
 * Geocode - Chuyển địa chỉ thành tọa độ
 * @param {string} address - Địa chỉ cần geocode
 * @returns {Promise<Object>} Tọa độ và thông tin địa chỉ
 */
async function geocode(address) {
  if (!address) return null;

  const data = await makeRequest('Geocode', {
    address,
  });

  if (!data?.results?.[0]) return null;

  const result = data.results[0];
  return {
    formattedAddress: result.formatted_address,
    lat: result.geometry?.location?.lat,
    lng: result.geometry?.location?.lng,
    placeId: result.place_id,
    compound: result.compound,
  };
}

/**
 * Reverse Geocode - Chuyển tọa độ thành địa chỉ
 * @param {number} lat - Vĩ độ
 * @param {number} lng - Kinh độ
 * @returns {Promise<Object>} Thông tin địa chỉ
 */
async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return null;

  const data = await makeRequest('Geocode', {
    latlng: `${lat},${lng}`,
  });

  if (!data?.results?.[0]) return null;

  const result = data.results[0];
  return {
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    compound: result.compound ? {
      district: result.compound.district,
      commune: result.compound.commune,
      province: result.compound.province,
    } : null,
    addressComponents: result.address_components,
  };
}

/**
 * Tính khoảng cách và thời gian di chuyển
 * @param {string} origins - Điểm xuất phát "lat,lng" hoặc "lat,lng|lat,lng"
 * @param {string} destinations - Điểm đến "lat,lng" hoặc "lat,lng|lat,lng"
 * @param {string} vehicle - Loại phương tiện: car, bike, taxi, truck
 * @returns {Promise<Object>} Ma trận khoảng cách
 */
async function distanceMatrix(origins, destinations, vehicle = 'bike') {
  if (!origins || !destinations) return null;

  const data = await makeRequest('DistanceMatrix', {
    origins,
    destinations,
    vehicle,
  });

  if (!data?.rows) return null;

  return {
    originAddresses: data.origin_addresses,
    destinationAddresses: data.destination_addresses,
    rows: data.rows.map(row => ({
      elements: row.elements.map(el => ({
        status: el.status,
        distance: el.distance ? {
          text: el.distance.text,
          value: el.distance.value, // meters
        } : null,
        duration: el.duration ? {
          text: el.duration.text,
          value: el.duration.value, // seconds
        } : null,
      })),
    })),
  };
}

/**
 * Tính khoảng cách giữa 2 điểm
 * @param {number} fromLat 
 * @param {number} fromLng 
 * @param {number} toLat 
 * @param {number} toLng 
 * @param {string} vehicle - car, bike, taxi, truck
 * @returns {Promise<Object>} { distanceKm, durationMinutes }
 */
async function getDistance(fromLat, fromLng, toLat, toLng, vehicle = 'bike') {
  const result = await distanceMatrix(
    `${fromLat},${fromLng}`,
    `${toLat},${toLng}`,
    vehicle
  );

  if (!result?.rows?.[0]?.elements?.[0]) return null;

  const element = result.rows[0].elements[0];
  if (element.status !== 'OK') return null;

  return {
    distanceKm: element.distance ? element.distance.value / 1000 : null,
    distanceText: element.distance?.text,
    durationMinutes: element.duration ? Math.ceil(element.duration.value / 60) : null,
    durationText: element.duration?.text,
  };
}

/**
 * Check if Goong API is available
 */
function isAvailable() {
  return !!GOONG_API_KEY;
}

module.exports = {
  autocomplete,
  getPlaceDetail,
  geocode,
  reverseGeocode,
  distanceMatrix,
  getDistance,
  isAvailable,
  
  // Constants
  GOONG_API_KEY,
  GOONG_MAP_KEY,
};
