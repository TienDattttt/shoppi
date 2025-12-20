/**
 * Seed 2 test shippers for Bưu cục Phường Hòa Bình 2
 * Post office ID: f752a44f-1f63-4261-827a-c0fba37a08be
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const POST_OFFICE_ID = 'f752a44f-1f63-4261-827a-c0fba37a08be';
const PASSWORD = 'Test@123';

const TEST_SHIPPERS = [
  {
    phone: '+84901111001',
    fullName: 'Nguyễn Văn Shipper A',
    idCardNumber: '079201001001',
    vehicleType: 'motorbike',
    vehiclePlate: '59A1-11111',
  },
  {
    phone: '+84901111002',
    fullName: 'Trần Thị Shipper B',
    idCardNumber: '079201001002',
    vehicleType: 'motorbike',
    vehiclePlate: '59A1-22222',
  },
];

async function main() {
  console.log('='.repeat(60));
  console.log('Seeding 2 test shippers for Bưu cục Phường Hòa Bình 2');
  console.log('='.repeat(60));

  // Verify post office exists
  const { data: postOffice } = await supabaseAdmin
    .from('post_offices')
    .select('id, code, name_vi')
    .eq('id', POST_OFFICE_ID)
    .single();

  if (!postOffice) {
    console.error('❌ Post office not found:', POST_OFFICE_ID);
    process.exit(1);
  }

  console.log(`\n📍 Post Office: ${postOffice.name_vi} (${postOffice.code})`);

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  for (const shipper of TEST_SHIPPERS) {
    console.log(`\n👤 Creating shipper: ${shipper.fullName}`);

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', shipper.phone)
      .single();

    let userId;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`  User exists: ${userId}`);
    } else {
      // Create user
      userId = uuidv4();
      const { error: userError } = await supabaseAdmin.from('users').insert({
        id: userId,
        phone: shipper.phone,
        full_name: shipper.fullName,
        password_hash: hashedPassword,
        role: 'shipper',
        status: 'active',
      });

      if (userError) {
        console.error(`  ❌ User error: ${userError.message}`);
        continue;
      }
      console.log(`  ✓ User created: ${userId}`);
    }

    // Check if shipper exists
    const { data: existingShipper } = await supabaseAdmin
      .from('shippers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingShipper) {
      // Update shipper
      const { error } = await supabaseAdmin
        .from('shippers')
        .update({
          post_office_id: POST_OFFICE_ID,
          status: 'active',
          is_online: true,
          is_available: true,
        })
        .eq('id', existingShipper.id);

      if (error) {
        console.error(`  ❌ Update error: ${error.message}`);
      } else {
        console.log(`  ✓ Shipper updated: ${existingShipper.id}`);
      }
    } else {
      // Create shipper
      const shipperId = uuidv4();
      const { error } = await supabaseAdmin.from('shippers').insert({
        id: shipperId,
        user_id: userId,
        id_card_number: shipper.idCardNumber,
        vehicle_type: shipper.vehicleType,
        vehicle_plate: shipper.vehiclePlate,
        post_office_id: POST_OFFICE_ID,
        status: 'active',
        is_online: true,
        is_available: true,
        current_pickup_count: 0,
        current_delivery_count: 0,
      });

      if (error) {
        console.error(`  ❌ Shipper error: ${error.message}`);
      } else {
        console.log(`  ✓ Shipper created: ${shipperId}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Done!');
  console.log(`\nLogin credentials:`);
  TEST_SHIPPERS.forEach(s => {
    // Display phone in 0xxx format for user convenience
    const displayPhone = s.phone.replace('+84', '0');
    console.log(`  Phone: ${displayPhone} | Password: ${PASSWORD}`);
  });
  console.log('='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
