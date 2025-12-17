/**
 * Seed test shipper for Bưu cục Phường Ô Chợ Dừa 1
 * Run: node src/database/seeds/seed-test-shipper-o-cho-dua.js
 */

require('dotenv').config();
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const bcrypt = require('bcryptjs');

const DELIVERY_OFFICE_ID = '4deb4d9f-78ef-4c79-841f-4d954a5ddd93';

async function seedTestShipper() {
  console.log('Creating test shipper for Bưu cục Ô Chợ Dừa 1...\n');

  // 1. Create user
  const phone = '0901111003';
  const normalizedPhone = '+84901111003';
  const passwordHash = await bcrypt.hash('Test@123', 10);

  // Check if user exists
  let { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('phone', normalizedPhone)
    .single();

  let userId;
  if (existingUser) {
    userId = existingUser.id;
    console.log('User already exists:', userId);
  } else {
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        phone: normalizedPhone,
        password_hash: passwordHash,
        full_name: 'Shipper C - Ô Chợ Dừa',
        role: 'shipper',
        status: 'active',
      })
      .select()
      .single();

    if (userError) {
      console.error('Failed to create user:', userError);
      return;
    }
    userId = newUser.id;
    console.log('Created user:', userId);
  }

  // 2. Check if shipper exists
  let { data: existingShipper } = await supabaseAdmin
    .from('shippers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingShipper) {
    // Update shipper
    await supabaseAdmin
      .from('shippers')
      .update({
        post_office_id: DELIVERY_OFFICE_ID,
        status: 'active',
        is_online: true,
        is_available: true,
      })
      .eq('id', existingShipper.id);
    console.log('Updated existing shipper:', existingShipper.id);
  } else {
    // Create shipper
    const { data: newShipper, error: shipperError } = await supabaseAdmin
      .from('shippers')
      .insert({
        user_id: userId,
        post_office_id: DELIVERY_OFFICE_ID,
        vehicle_type: 'motorbike',
        vehicle_plate: '29-C1-12345',
        status: 'active',
        is_online: true,
        is_available: true,
        current_pickup_count: 0,
        current_delivery_count: 0,
      })
      .select()
      .single();

    if (shipperError) {
      console.error('Failed to create shipper:', shipperError);
      return;
    }
    console.log('Created shipper:', newShipper.id);
  }

  // 3. Verify
  const { data: office } = await supabaseAdmin
    .from('post_offices')
    .select('name_vi')
    .eq('id', DELIVERY_OFFICE_ID)
    .single();

  const { data: shippers } = await supabaseAdmin
    .from('shippers')
    .select('id, status, is_online, is_available, user_id')
    .eq('post_office_id', DELIVERY_OFFICE_ID);

  console.log('\n=== Verification ===');
  console.log('Office:', office?.name_vi);
  console.log('Shippers:', shippers);
  console.log('\nTest credentials:');
  console.log('Phone:', phone);
  console.log('Password: Test@123');
}

seedTestShipper().catch(console.error);
