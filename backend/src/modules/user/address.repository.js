/**
 * Address Repository
 * Database operations for user addresses
 */

const { supabaseAdmin: supabase } = require('../../shared/supabase/supabase.client');

/**
 * Get user's addresses
 */
async function getUserAddresses(userId) {
  const { data, error } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Get address by ID
 */
async function getAddressById(addressId, userId) {
  const { data, error } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Create address
 */
async function createAddress(userId, addressData) {
  const { data, error } = await supabase
    .from('user_addresses')
    .insert({
      user_id: userId,
      name: addressData.name,
      phone: addressData.phone,
      province: addressData.province,
      district: addressData.district,
      ward: addressData.ward,
      address_line: addressData.addressLine,
      full_address: addressData.fullAddress || `${addressData.addressLine}, ${addressData.ward}, ${addressData.district}, ${addressData.province}`,
      is_default: addressData.isDefault || false,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update address
 */
async function updateAddress(addressId, userId, addressData) {
  const updateData = {};
  
  if (addressData.name !== undefined) updateData.name = addressData.name;
  if (addressData.phone !== undefined) updateData.phone = addressData.phone;
  if (addressData.province !== undefined) updateData.province = addressData.province;
  if (addressData.district !== undefined) updateData.district = addressData.district;
  if (addressData.ward !== undefined) updateData.ward = addressData.ward;
  if (addressData.addressLine !== undefined) updateData.address_line = addressData.addressLine;
  if (addressData.fullAddress !== undefined) updateData.full_address = addressData.fullAddress;
  if (addressData.isDefault !== undefined) updateData.is_default = addressData.isDefault;
  
  updateData.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('user_addresses')
    .update(updateData)
    .eq('id', addressId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Delete address
 */
async function deleteAddress(addressId, userId) {
  const { error } = await supabase
    .from('user_addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', userId);
  
  if (error) throw error;
}

/**
 * Set default address
 */
async function setDefaultAddress(addressId, userId) {
  // The trigger will handle unsetting other defaults
  const { data, error } = await supabase
    .from('user_addresses')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', addressId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

module.exports = {
  getUserAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
