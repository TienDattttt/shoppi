/**
 * Seed Shippers for Testing Admin Management
 * Run: node src/database/seed-shippers.js
 * 
 * Creates shippers with various statuses:
 * - pending: Chờ duyệt
 * - active: Đang hoạt động
 * - suspended: Tạm ngưng
 * - inactive: Ngừng hoạt động
 */

const { supabaseAdmin } = require('../shared/supabase/supabase.client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const PASSWORD = 'Test@123';

// Shipper data with various statuses
const SHIPPERS_DATA = [
  // PENDING - Chờ duyệt (mới đăng ký)
  {
    phone: '0911000001',
    fullName: 'Nguyễn Văn Pending 1',
    idCardNumber: '079201000001',
    vehicleType: 'motorbike',
    vehiclePlate: '59A1-00001',
    vehicleBrand: 'Honda',
    vehicleModel: 'Wave Alpha',
    workingDistrict: 'Quận 1',
    workingCity: 'TP. Hồ Chí Minh',
    status: 'pending',
  },
  {
    phone: '0911000002',
    fullName: 'Trần Thị Pending 2',
    idCardNumber: '079201000002',
    vehicleType: 'motorbike',
    vehiclePlate: '59A1-00002',
    vehicleBrand: 'Yamaha',
    vehicleModel: 'Sirius',
    workingDistrict: 'Quận 3',
    workingCity: 'TP. Hồ Chí Minh',
    status: 'pending',
  },
  {
    phone: '0911000003',
    fullName: 'Lê Hoàng Pending 3',
    idCardNumber: '079201000003',
    vehicleType: 'car',
    vehiclePlate: '51G-00003',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Vios',
    workingDistrict: 'Quận 7',
    workingCity: 'TP. Hồ Chí Minh',
    status: 'pending',
  },

  // ACTIVE - Đang hoạt động
  {
    phone: '0911000011',
    fullName: 'Phạm Minh Active 1',
    idCardNumber: '079201000011',
    vehicleType: 'motorbike',
    vehiclePlate: '59A1-00011',
    vehicleBrand: 'Honda',
    vehicleModel: 'SH 150i',
    workingDistrict: 'Quận Bình Thạnh',
    workingCity: 'TP. Hồ Chí Minh',
    status: 'active',
    isOnline: true,
    isAvailable: true,
    totalDeliveries: 156,
    successfulDeliveries: 148,
    failedDeliveries: 8,
    avgRating: 4.8,
    totalRatings: 120,
  },
  {
    phone: '0911000012',
    fullName: 'Võ Thị Active 2',
    idCardNumber: '079201000012',
    vehicleType: 'motorbike',
    vehiclePlate: '59A1-00012',
    vehicleBrand: 'Yamaha',
    vehicleModel: 'Exciter 155',
    workingDistrict: 'Quận Tân Bình',
    workingCity: 'TP. Hồ Chí Minh',
    status: 'active',
    isOnline: true,
    isAvailable: false, // Đang giao hàng
    totalDeliveries: 89,
    successfulDeliveries: 85,
    failedDeliveries: 4,
    avgRating: 4.6,
    totalRatings: 75,
  },
  {
    phone: '0911000013',
    fullName: 'Đặng Văn Active 3',
    idCardNumber: '079201000013',
    vehicleType: 'motorbike',
    vehiclePlate: '59A1-00013',
    vehicleBrand: 'Honda',
    vehicleModel: 'Air Blade',
    workingDistrict: 'Quận Gò Vấp',
    workingCity: 'TP. Hồ Chí Minh',
    status: 'active',
    isOnline: false, // Offline
    isAvailable: true,
    totalDeliveries: 234,
    successfulDeliveries: 220,
    failedDeliveries: 14,
    avgRating: 4.5,
    totalRatings: 180,
  },
  {
    phone: '0911000014',
    fullName: 'Bùi Thị Active 4',
    idCardNumber: '079201000014',
    vehicleType: 'car',
    vehiclePlate: '51G-00014',
    vehicleBrand: 'Hyundai',
    vehicleModel: 'Accent',
    workingDistrict: 'Quận 2',
    workingCity: 'TP. Hồ Chí Minh',
    status: 'active',
    isOnline: true,
    isAvailable: true,
    totalDeliveries: 67,
    successfulDeliveries: 65,
    failedDeliveries: 2,
    avgRating: 4.9,
    totalRatings: 55,
  },

  // SUSPENDED - Tạm ngưng (vi phạm hoặc rating thấp)
  {
    phone: '0911000021',
    fullName: 'Hoàng Văn Suspended 1',
    idCardNumber: '079201000021',
    vehicleType: 'motorbike',
    vehiclePlate: '59A1-00021',
    vehicleBrand: 'Honda',
    vehicleModel: 'Vision',
    workingDistrict: 'Quận 10',
    workingCity: 'TP. Hồ Chí Minh',
    status: 'suspended',
    isOnline: false,
    isAvailable: false,
    totalDeliveries: 45,
    successfulDeliveries: 32,
    failedDeliveries: 13,
    avgRating: 2.8,
    totalRatings: 30,
    isFlagged: true,
    flaggedReason: 'Rating dưới 3.0 - Nhiều đơn giao thất bại',
  },
  {
    phone: '0911000022',
    fullName: 'Ngô Thị Suspended 2',
    idCardNumber: '079201000022',
    vehicleType: 'motorbike',
    vehiclePlate: '59A1-00022',
    vehicleBrand: 'Yamaha',
    vehicleModel: 'Janus',
    workingDistrict: 'Quận 5',
    workingCity: 'TP. Hồ Chí Minh',
    status: 'suspended',
    isOnline: false,
    isAvailable: false,
    totalDeliveries: 78,
    successfulDeliveries: 60,
    failedDeliveries: 18,
    avgRating: 3.2,
    totalRatings: 50,
    isFlagged: true,
    flaggedReason: 'Khách hàng phản ánh thái độ không tốt',
  },

  // INACTIVE - Ngừng hoạt động (tự nghỉ)
  {
    phone: '0911000031',
    fullName: 'Trương Văn Inactive 1',
    idCardNumber: '079201000031',
    vehicleType: 'motorbike',
    vehiclePlate: '59A1-00031',
    vehicleBrand: 'Honda',
    vehicleModel: 'Lead',
    workingDistrict: 'Quận 12',
    workingCity: 'TP. Hồ Chí Minh',
    status: 'inactive',
    isOnline: false,
    isAvailable: false,
    totalDeliveries: 120,
    successfulDeliveries: 115,
    failedDeliveries: 5,
    avgRating: 4.7,
    totalRatings: 100,
  },

  // Shippers ở Hà Nội
  {
    phone: '0911000041',
    fullName: 'Nguyễn Hà Nội 1',
    idCardNumber: '001201000041',
    vehicleType: 'motorbike',
    vehiclePlate: '29A1-00041',
    vehicleBrand: 'Honda',
    vehicleModel: 'Wave RSX',
    workingDistrict: 'Quận Hoàn Kiếm',
    workingCity: 'Hà Nội',
    status: 'active',
    isOnline: true,
    isAvailable: true,
    totalDeliveries: 200,
    successfulDeliveries: 190,
    failedDeliveries: 10,
    avgRating: 4.6,
    totalRatings: 150,
  },
  {
    phone: '0911000042',
    fullName: 'Trần Hà Nội 2',
    idCardNumber: '001201000042',
    vehicleType: 'motorbike',
    vehiclePlate: '29A1-00042',
    vehicleBrand: 'Yamaha',
    vehicleModel: 'NVX 155',
    workingDistrict: 'Quận Cầu Giấy',
    workingCity: 'Hà Nội',
    status: 'pending',
  },

  // Shippers ở Đà Nẵng
  {
    phone: '0911000051',
    fullName: 'Lê Đà Nẵng 1',
    idCardNumber: '048201000051',
    vehicleType: 'motorbike',
    vehiclePlate: '43A1-00051',
    vehicleBrand: 'Honda',
    vehicleModel: 'Winner X',
    workingDistrict: 'Quận Hải Châu',
    workingCity: 'Đà Nẵng',
    status: 'active',
    isOnline: true,
    isAvailable: true,
    totalDeliveries: 95,
    successfulDeliveries: 90,
    failedDeliveries: 5,
    avgRating: 4.7,
    totalRatings: 80,
  },
];

async function seedShippers() {
  console.log('='.repeat(60));
  console.log('🚚 Seeding Shippers for Admin Management Testing');
  console.log('='.repeat(60));

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  
  // Get some post offices to assign
  const { data: postOffices } = await supabaseAdmin
    .from('post_offices')
    .select('id, name_vi, city')
    .eq('office_type', 'local')
    .limit(10);

  console.log(`\n📍 Found ${postOffices?.length || 0} post offices`);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < SHIPPERS_DATA.length; i++) {
    const shipper = SHIPPERS_DATA[i];
    console.log(`\n👤 Processing: ${shipper.fullName}`);

    try {
      // Normalize phone
      const normalizedPhone = shipper.phone.startsWith('0') 
        ? '+84' + shipper.phone.slice(1) 
        : shipper.phone;

      // Check if user exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .single();

      let userId;

      if (existingUser) {
        userId = existingUser.id;
        console.log(`   User exists: ${userId.slice(0, 8)}...`);
      } else {
        // Create user
        userId = uuidv4();
        const { error: userError } = await supabaseAdmin.from('users').insert({
          id: userId,
          phone: normalizedPhone,
          full_name: shipper.fullName,
          password_hash: hashedPassword,
          role: 'shipper',
          status: shipper.status === 'pending' ? 'pending' : 'active',
        });

        if (userError) {
          console.error(`   ❌ User error: ${userError.message}`);
          failed++;
          continue;
        }
        console.log(`   ✓ User created`);
      }

      // Assign to a post office based on city
      let postOfficeId = null;
      if (postOffices?.length && shipper.status === 'active') {
        const matchingOffice = postOffices.find(po => 
          po.city?.includes(shipper.workingCity?.split(' ')[0]) ||
          shipper.workingCity?.includes(po.city?.split(' ')[0])
        );
        postOfficeId = matchingOffice?.id || postOffices[i % postOffices.length]?.id;
      }

      // Check if shipper exists
      const { data: existingShipper } = await supabaseAdmin
        .from('shippers')
        .select('id')
        .eq('user_id', userId)
        .single();

      const shipperData = {
        user_id: userId,
        id_card_number: shipper.idCardNumber,
        vehicle_type: shipper.vehicleType,
        vehicle_plate: shipper.vehiclePlate,
        vehicle_brand: shipper.vehicleBrand,
        vehicle_model: shipper.vehicleModel,
        working_district: shipper.workingDistrict,
        working_city: shipper.workingCity,
        status: shipper.status,
        is_online: shipper.isOnline || false,
        is_available: shipper.isAvailable ?? true,
        total_deliveries: shipper.totalDeliveries || 0,
        successful_deliveries: shipper.successfulDeliveries || 0,
        failed_deliveries: shipper.failedDeliveries || 0,
        avg_rating: shipper.avgRating || 0,
        total_ratings: shipper.totalRatings || 0,
        post_office_id: postOfficeId,
        current_pickup_count: 0,
        current_delivery_count: 0,
        is_flagged: shipper.isFlagged || false,
        flagged_reason: shipper.flaggedReason || null,
        flagged_at: shipper.isFlagged ? new Date().toISOString() : null,
      };

      if (existingShipper) {
        // Update
        const { error } = await supabaseAdmin
          .from('shippers')
          .update(shipperData)
          .eq('id', existingShipper.id);

        if (error) {
          console.error(`   ❌ Update error: ${error.message}`);
          failed++;
        } else {
          console.log(`   ✓ Shipper updated | Status: ${shipper.status}`);
          updated++;
        }
      } else {
        // Create
        const { error } = await supabaseAdmin.from('shippers').insert({
          id: uuidv4(),
          ...shipperData,
        });

        if (error) {
          console.error(`   ❌ Create error: ${error.message}`);
          failed++;
        } else {
          console.log(`   ✓ Shipper created | Status: ${shipper.status}`);
          created++;
        }
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${SHIPPERS_DATA.length}`);
  
  // Count by status
  const pending = SHIPPERS_DATA.filter(s => s.status === 'pending').length;
  const active = SHIPPERS_DATA.filter(s => s.status === 'active').length;
  const suspended = SHIPPERS_DATA.filter(s => s.status === 'suspended').length;
  const inactive = SHIPPERS_DATA.filter(s => s.status === 'inactive').length;
  
  console.log('\n📈 By Status:');
  console.log(`   Pending: ${pending}`);
  console.log(`   Active: ${active}`);
  console.log(`   Suspended: ${suspended}`);
  console.log(`   Inactive: ${inactive}`);

  console.log('\n🔑 Login credentials:');
  console.log(`   Password for all: ${PASSWORD}`);
  console.log('   Sample phones:');
  SHIPPERS_DATA.slice(0, 5).forEach(s => {
    console.log(`     ${s.phone} - ${s.fullName} (${s.status})`);
  });
  
  console.log('='.repeat(60));
}

seedShippers()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
