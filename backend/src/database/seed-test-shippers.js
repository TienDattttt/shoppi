/**
 * Seed test shippers for development
 * Tạo shipper test cho các bưu cục ở HCM và Hà Nội
 */

const { supabaseAdmin } = require('../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

async function seedTestShippers() {
  console.log('='.repeat(60));
  console.log('Seeding test shippers...');
  console.log('='.repeat(60));

  // 1. Lấy một số bưu cục ở HCM (mã tỉnh 79) và Hà Nội (mã tỉnh 01)
  const { data: offices } = await supabaseAdmin
    .from('post_offices')
    .select('*')
    .eq('office_type', 'local')
    .in('province_code', ['79', '01'])
    .limit(10);

  if (!offices || offices.length === 0) {
    console.log('No post offices found!');
    return;
  }

  console.log(`Found ${offices.length} post offices`);

  // 2. Tạo user shipper test
  const shipperUsers = [];
  for (let i = 1; i <= 10; i++) {
    const userId = uuidv4();
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: `shipper${i}@test.com`,
        phone: `090000000${i.toString().padStart(2, '0')}`,
        full_name: `Shipper Test ${i}`,
        role: 'shipper',
        status: 'active',
        password_hash: '$2b$10$test', // dummy hash
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // User already exists, get it
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', `shipper${i}@test.com`)
          .single();
        if (existingUser) {
          shipperUsers.push(existingUser);
          console.log(`  User shipper${i}@test.com already exists`);
        }
      } else {
        console.error(`  Error creating user ${i}:`, error.message);
      }
    } else {
      shipperUsers.push(user);
      console.log(`  Created user: ${user.full_name}`);
    }
  }

  // 3. Tạo shipper records
  console.log('\nCreating shipper records...');
  
  for (let i = 0; i < shipperUsers.length; i++) {
    const user = shipperUsers[i];
    const office = offices[i % offices.length]; // Phân bổ đều vào các bưu cục

    // Check if shipper already exists
    const { data: existingShipper } = await supabaseAdmin
      .from('shippers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingShipper) {
      // Update existing shipper
      const { error } = await supabaseAdmin
        .from('shippers')
        .update({
          post_office_id: office.id,
          status: 'active',
          is_online: true,
          is_available: true,
          current_lat: office.lat,
          current_lng: office.lng,
        })
        .eq('id', existingShipper.id);

      if (error) {
        console.error(`  Error updating shipper ${user.full_name}:`, error.message);
      } else {
        console.log(`  Updated shipper: ${user.full_name} -> ${office.name_vi}`);
      }
    } else {
      // Create new shipper
      const { error } = await supabaseAdmin
        .from('shippers')
        .insert({
          id: uuidv4(),
          user_id: user.id,
          post_office_id: office.id,
          status: 'active',
          is_online: true,
          is_available: true,
          vehicle_type: 'motorcycle',
          vehicle_plate: `59A-${(10000 + i).toString()}`,
          current_lat: office.lat,
          current_lng: office.lng,
          current_pickup_count: 0,
          current_delivery_count: 0,
          max_daily_orders: 50,
        });

      if (error) {
        console.error(`  Error creating shipper ${user.full_name}:`, error.message);
      } else {
        console.log(`  Created shipper: ${user.full_name} -> ${office.name_vi}`);
      }
    }
  }

  // 4. Update shops with coordinates (HCM area)
  console.log('\nUpdating shops with coordinates...');
  const { data: shops } = await supabaseAdmin
    .from('shops')
    .select('*')
    .is('lat', null);

  if (shops?.length) {
    for (const shop of shops) {
      // Set coordinates to HCM area (random within city)
      const lat = 10.75 + (Math.random() - 0.5) * 0.1;
      const lng = 106.65 + (Math.random() - 0.5) * 0.1;

      const { error } = await supabaseAdmin
        .from('shops')
        .update({ lat, lng })
        .eq('id', shop.id);

      if (error) {
        console.error(`  Error updating shop ${shop.shop_name}:`, error.message);
      } else {
        console.log(`  Updated shop: ${shop.shop_name} -> lat: ${lat.toFixed(4)}, lng: ${lng.toFixed(4)}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Done! Now run check-data.js to verify');
  console.log('='.repeat(60));
}

seedTestShippers()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
