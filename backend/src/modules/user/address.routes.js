/**
 * Address Routes
 * API endpoints for user address management
 */

const express = require('express');
const addressRepository = require('./address.repository');
const { authenticate } = require('../auth/auth.middleware');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');

const router = express.Router();

router.use(authenticate);

/**
 * Serialize address for API response
 */
function serializeAddress(address) {
  return {
    id: address.id,
    name: address.name,
    phone: address.phone,
    province: address.province,
    district: address.district,
    ward: address.ward,
    addressLine: address.address_line,
    fullAddress: address.full_address,
    isDefault: address.is_default,
    createdAt: address.created_at,
    updatedAt: address.updated_at,
  };
}

/**
 * GET /addresses - Get user's addresses
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const addresses = await addressRepository.getUserAddresses(userId);
    return sendSuccess(res, addresses.map(serializeAddress));
  } catch (error) {
    console.error('[AddressRoutes] Get addresses error:', error);
    return sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

/**
 * GET /addresses/:id - Get address by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const address = await addressRepository.getAddressById(id, userId);
    
    if (!address) {
      return sendError(res, 'NOT_FOUND', 'Address not found', 404);
    }
    
    return sendSuccess(res, serializeAddress(address));
  } catch (error) {
    console.error('[AddressRoutes] Get address error:', error);
    return sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

/**
 * POST /addresses - Create new address
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone, province, district, ward, addressLine, fullAddress, isDefault } = req.body;
    
    if (!name || !phone || !addressLine) {
      return sendError(res, 'VALIDATION_ERROR', 'Name, phone and address are required', 400);
    }
    
    const address = await addressRepository.createAddress(userId, {
      name,
      phone,
      province,
      district,
      ward,
      addressLine,
      fullAddress,
      isDefault,
    });
    
    return sendSuccess(res, serializeAddress(address), 201);
  } catch (error) {
    console.error('[AddressRoutes] Create address error:', error);
    return sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

/**
 * PUT /addresses/:id - Update address
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    const address = await addressRepository.updateAddress(id, userId, req.body);
    
    if (!address) {
      return sendError(res, 'NOT_FOUND', 'Address not found', 404);
    }
    
    return sendSuccess(res, serializeAddress(address));
  } catch (error) {
    console.error('[AddressRoutes] Update address error:', error);
    return sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

/**
 * DELETE /addresses/:id - Delete address
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    await addressRepository.deleteAddress(id, userId);
    return sendSuccess(res, { message: 'Address deleted' });
  } catch (error) {
    console.error('[AddressRoutes] Delete address error:', error);
    return sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

/**
 * POST /addresses/:id/default - Set as default address
 */
router.post('/:id/default', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    const address = await addressRepository.setDefaultAddress(id, userId);
    
    if (!address) {
      return sendError(res, 'NOT_FOUND', 'Address not found', 404);
    }
    
    return sendSuccess(res, serializeAddress(address));
  } catch (error) {
    console.error('[AddressRoutes] Set default error:', error);
    return sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

module.exports = router;
