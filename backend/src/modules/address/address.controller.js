/**
 * Address Controller
 * API endpoints cho địa chỉ autocomplete và geocoding
 * Sử dụng Goong.io cho dashboard, Google Maps cho mobile
 */

const goongClient = require('../../shared/goong/goong.client');
const mapsClient = require('../../shared/google-maps/maps.client');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');

/**
 * GET /api/address/autocomplete
 * Gợi ý địa chỉ khi nhập
 */
async function autocomplete(req, res) {
  try {
    const { q, lat, lng, limit = 10, provider = 'goong' } = req.query;

    if (!q || q.length < 2) {
      return sendSuccess(res, { suggestions: [] });
    }

    let suggestions = [];

    if (provider === 'goong' && goongClient.isAvailable()) {
      // Use Goong for Vietnam addresses
      suggestions = await goongClient.autocomplete(q, {
        location: lat && lng ? `${lat},${lng}` : undefined,
        limit: parseInt(limit),
      });
    } else if (mapsClient.isAvailable()) {
      // Fallback to Google Maps
      const results = await mapsClient.autocomplete(q, {
        country: 'vn',
        types: 'address',
      });
      suggestions = results?.predictions?.map(p => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text,
        secondaryText: p.structured_formatting?.secondary_text,
      })) || [];
    }

    return sendSuccess(res, { suggestions });
  } catch (error) {
    console.error('[AddressController] autocomplete error:', error);
    return sendError(res, 'AUTOCOMPLETE_ERROR', error.message, 500);
  }
}

/**
 * GET /api/address/place/:placeId
 * Lấy chi tiết địa điểm từ place_id
 */
async function getPlaceDetail(req, res) {
  try {
    const { placeId } = req.params;
    const { provider = 'goong' } = req.query;

    if (!placeId) {
      return sendError(res, 'INVALID_PLACE_ID', 'Place ID is required', 400);
    }

    let place = null;

    if (provider === 'goong' && goongClient.isAvailable()) {
      place = await goongClient.getPlaceDetail(placeId);
    } else if (mapsClient.isAvailable()) {
      place = await mapsClient.getPlaceDetails(placeId);
    }

    if (!place) {
      return sendError(res, 'PLACE_NOT_FOUND', 'Place not found', 404);
    }

    return sendSuccess(res, { place });
  } catch (error) {
    console.error('[AddressController] getPlaceDetail error:', error);
    return sendError(res, 'PLACE_DETAIL_ERROR', error.message, 500);
  }
}

/**
 * GET /api/address/geocode
 * Chuyển địa chỉ thành tọa độ
 */
async function geocode(req, res) {
  try {
    const { address, provider = 'goong' } = req.query;

    if (!address) {
      return sendError(res, 'INVALID_ADDRESS', 'Address is required', 400);
    }

    let result = null;

    if (provider === 'goong' && goongClient.isAvailable()) {
      result = await goongClient.geocode(address);
    } else if (mapsClient.isAvailable()) {
      result = await mapsClient.geocode(address);
    }

    if (!result) {
      return sendError(res, 'GEOCODE_FAILED', 'Could not geocode address', 404);
    }

    return sendSuccess(res, { location: result });
  } catch (error) {
    console.error('[AddressController] geocode error:', error);
    return sendError(res, 'GEOCODE_ERROR', error.message, 500);
  }
}

/**
 * GET /api/address/reverse-geocode
 * Chuyển tọa độ thành địa chỉ
 */
async function reverseGeocode(req, res) {
  try {
    const { lat, lng, provider = 'goong' } = req.query;

    if (!lat || !lng) {
      return sendError(res, 'INVALID_COORDINATES', 'Lat and lng are required', 400);
    }

    let result = null;

    if (provider === 'goong' && goongClient.isAvailable()) {
      result = await goongClient.reverseGeocode(parseFloat(lat), parseFloat(lng));
    } else if (mapsClient.isAvailable()) {
      result = await mapsClient.reverseGeocode(parseFloat(lat), parseFloat(lng));
    }

    if (!result) {
      return sendError(res, 'REVERSE_GEOCODE_FAILED', 'Could not reverse geocode', 404);
    }

    return sendSuccess(res, { address: result });
  } catch (error) {
    console.error('[AddressController] reverseGeocode error:', error);
    return sendError(res, 'REVERSE_GEOCODE_ERROR', error.message, 500);
  }
}

/**
 * GET /api/address/distance
 * Tính khoảng cách giữa 2 điểm
 */
async function getDistance(req, res) {
  try {
    const { fromLat, fromLng, toLat, toLng, vehicle = 'bike', provider = 'goong' } = req.query;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return sendError(res, 'INVALID_COORDINATES', 'All coordinates are required', 400);
    }

    let result = null;

    if (provider === 'goong' && goongClient.isAvailable()) {
      result = await goongClient.getDistance(
        parseFloat(fromLat),
        parseFloat(fromLng),
        parseFloat(toLat),
        parseFloat(toLng),
        vehicle
      );
    } else if (mapsClient.isAvailable()) {
      result = await mapsClient.getDistance(
        `${fromLat},${fromLng}`,
        `${toLat},${toLng}`,
        'driving'
      );
    }

    if (!result) {
      return sendError(res, 'DISTANCE_CALC_FAILED', 'Could not calculate distance', 404);
    }

    return sendSuccess(res, { distance: result });
  } catch (error) {
    console.error('[AddressController] getDistance error:', error);
    return sendError(res, 'DISTANCE_ERROR', error.message, 500);
  }
}

module.exports = {
  autocomplete,
  getPlaceDetail,
  geocode,
  reverseGeocode,
  getDistance,
};
