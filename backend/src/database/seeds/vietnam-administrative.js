/**
 * Vietnam Administrative Data Seeder
 * 
 * Nguồn data: dvhcvn.json - Dữ liệu Đơn vị hành chính Việt Nam
 * Theo Công văn số 2896/BNV-CQĐP của Bộ Nội Vụ
 * 
 * Cấu trúc hành chính mới (2 cấp):
 * - Cấp tỉnh: 34 Tỉnh/Thành phố trực thuộc trung ương
 * - Cấp xã: 3321 Xã/Phường trực thuộc tỉnh
 * 
 * Không còn cấp quận/huyện!
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const fs = require('fs');
const path = require('path');

// Phân vùng miền theo mã tỉnh
const REGION_MAPPING = {
  // Miền Bắc
  north: ['01', '02', '04', '06', '08', '10', '11', '12', '14', '15', '17', '19', '20', '22', '24', '25', '26', '27', '30', '31', '33', '34', '35', '36', '37'],
  // Miền Trung
  central: ['38', '40', '42', '44', '45', '46', '48', '49', '51', '52', '54', '56', '58', '60', '62', '64', '66', '67', '68'],
  // Miền Nam
  south: ['70', '72', '74', '75', '77', '79', '80', '82', '83', '84', '86', '87', '89', '91', '92', '93', '94', '95', '96'],
};

// Tọa độ trung tâm các tỉnh/thành phố (Cập nhật đầy đủ 63 tỉnh thành)
const PROVINCE_COORDINATES = {
  // --- Miền Bắc ---
  '01': { lat: 21.0285, lng: 105.8542 }, // Hà Nội
  '02': { lat: 22.8233, lng: 104.9839 }, // Hà Giang
  '04': { lat: 22.6657, lng: 106.2522 }, // Cao Bằng
  '06': { lat: 22.1471, lng: 105.8348 }, // Bắc Kạn
  '08': { lat: 21.8237, lng: 105.2140 }, // Tuyên Quang
  '10': { lat: 22.4851, lng: 103.9707 }, // Lào Cai
  '11': { lat: 21.3850, lng: 103.0200 }, // Điện Biên
  '12': { lat: 22.3962, lng: 103.4619 }, // Lai Châu
  '14': { lat: 21.3256, lng: 103.9188 }, // Sơn La
  '15': { lat: 21.7169, lng: 104.9085 }, // Yên Bái
  '17': { lat: 20.8190, lng: 105.3420 }, // Hòa Bình
  '19': { lat: 21.5928, lng: 105.8442 }, // Thái Nguyên
  '20': { lat: 21.8491, lng: 106.7570 }, // Lạng Sơn
  '22': { lat: 21.0064, lng: 107.2925 }, // Quảng Ninh
  '24': { lat: 21.2820, lng: 106.1975 }, // Bắc Giang
  '25': { lat: 21.3228, lng: 105.2280 }, // Phú Thọ
  '26': { lat: 21.3094, lng: 105.5966 }, // Vĩnh Phúc
  '27': { lat: 21.1861, lng: 106.0763 }, // Bắc Ninh
  '30': { lat: 20.9392, lng: 106.3150 }, // Hải Dương
  '31': { lat: 20.8449, lng: 106.6881 }, // Hải Phòng
  '33': { lat: 20.6548, lng: 106.0515 }, // Hưng Yên
  '34': { lat: 20.4463, lng: 106.3366 }, // Thái Bình
  '35': { lat: 20.5447, lng: 105.9150 }, // Hà Nam
  '36': { lat: 20.4285, lng: 106.1683 }, // Nam Định
  '37': { lat: 20.2506, lng: 105.9749 }, // Ninh Bình

  // --- Miền Trung ---
  '38': { lat: 19.8067, lng: 105.7852 }, // Thanh Hóa
  '40': { lat: 18.6796, lng: 105.6813 }, // Nghệ An
  '42': { lat: 18.3432, lng: 105.9069 }, // Hà Tĩnh
  '44': { lat: 17.4721, lng: 106.6025 }, // Quảng Bình
  '45': { lat: 16.8220, lng: 107.0988 }, // Quảng Trị
  '46': { lat: 16.4637, lng: 107.5909 }, // Thừa Thiên Huế
  '48': { lat: 16.0544, lng: 108.2022 }, // Đà Nẵng
  '49': { lat: 15.5786, lng: 108.4716 }, // Quảng Nam
  '51': { lat: 15.1197, lng: 108.8028 }, // Quảng Ngãi
  '52': { lat: 13.9789, lng: 109.1118 }, // Bình Định
  '54': { lat: 13.0880, lng: 109.3082 }, // Phú Yên
  '56': { lat: 12.2388, lng: 109.1967 }, // Khánh Hòa
  '58': { lat: 11.5645, lng: 108.9950 }, // Ninh Thuận
  '60': { lat: 11.0850, lng: 108.0640 }, // Bình Thuận
  '62': { lat: 14.3497, lng: 108.0006 }, // Kon Tum
  '64': { lat: 13.9877, lng: 108.0002 }, // Gia Lai
  '66': { lat: 12.6669, lng: 108.0381 }, // Đắk Lắk
  '67': { lat: 11.9961, lng: 107.6975 }, // Đắk Nông
  '68': { lat: 11.9404, lng: 108.4583 }, // Lâm Đồng

  // --- Miền Nam ---
  '70': { lat: 11.7523, lng: 106.7028 }, // Bình Phước
  '72': { lat: 11.3653, lng: 106.1207 }, // Tây Ninh
  '74': { lat: 11.1712, lng: 106.6010 }, // Bình Dương
  '75': { lat: 10.9574, lng: 106.8426 }, // Đồng Nai
  '77': { lat: 10.5186, lng: 107.2435 }, // Bà Rịa - Vũng Tàu
  '79': { lat: 10.8231, lng: 106.6297 }, // TP.HCM
  '80': { lat: 10.6972, lng: 106.4170 }, // Long An
  '82': { lat: 10.4285, lng: 106.3429 }, // Tiền Giang
  '83': { lat: 10.2443, lng: 106.3754 }, // Bến Tre
  '84': { lat: 9.9328, lng: 106.3400 }, // Trà Vinh
  '86': { lat: 10.2541, lng: 105.9723 }, // Vĩnh Long
  '87': { lat: 10.4578, lng: 105.6265 }, // Đồng Tháp
  '89': { lat: 10.5392, lng: 105.1154 }, // An Giang
  '91': { lat: 10.0125, lng: 105.0809 }, // Kiên Giang
  '92': { lat: 10.0452, lng: 105.7469 }, // Cần Thơ
  '93': { lat: 9.7828, lng: 105.4744 }, // Hậu Giang
  '94': { lat: 9.6001, lng: 105.9772 }, // Sóc Trăng
  '95': { lat: 9.2941, lng: 105.7278 }, // Bạc Liêu
  '96': { lat: 9.1729, lng: 105.1524 }, // Cà Mau
};

/**
 * Xác định miền của tỉnh
 */
function getRegion(provinceCode) {
  for (const [region, codes] of Object.entries(REGION_MAPPING)) {
    if (codes.includes(provinceCode)) return region;
  }
  return 'south';
}

/**
 * Tạo slug từ tên
 */
function createSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Lấy tọa độ cho tỉnh
 */
function getProvinceCoordinates(provinceCode) {
  if (PROVINCE_COORDINATES[provinceCode]) {
    return PROVINCE_COORDINATES[provinceCode];
  }

  // Fallback nếu không có trong list (Hiếm khi xảy ra nếu list đầy đủ)
  const region = getRegion(provinceCode);
  const regionBounds = {
    north: { latMin: 20.5, latMax: 23.5, lngMin: 102, lngMax: 108 },
    central: { latMin: 11, latMax: 20.5, lngMin: 105, lngMax: 110 },
    south: { latMin: 8.5, latMax: 12, lngMin: 104, lngMax: 108 },
  };

  const bounds = regionBounds[region];
  return {
    lat: bounds.latMin + Math.random() * (bounds.latMax - bounds.latMin),
    lng: bounds.lngMin + Math.random() * (bounds.lngMax - bounds.lngMin),
  };
}

/**
 * Xác định loại xã/phường
 */
function getWardType(wardName) {
  if (wardName.startsWith('Phường')) return 'phuong';
  return 'xa'; // Xã, Thị trấn đều là nông thôn
}


/**
 * Seed provinces (tỉnh/thành phố)
 * 
 * Ưu tiên tọa độ từ dvhcvn.json, fallback sang PROVINCE_COORDINATES nếu không có
 */
async function seedProvinces(data) {
  console.log('Seeding provinces (tỉnh/thành phố)...');

  let count = 0;
  let fromJson = 0;
  let fromFallback = 0;

  for (const province of data) {
    const region = getRegion(province.province_code);
    
    // Ưu tiên tọa độ từ dvhcvn.json
    let lat, lng;
    if (province.lat && province.lng) {
      lat = province.lat;
      lng = province.lng;
      fromJson++;
    } else {
      // Fallback sang PROVINCE_COORDINATES
      const coords = getProvinceCoordinates(province.province_code);
      lat = coords.lat;
      lng = coords.lng;
      fromFallback++;
    }

    const { error } = await supabaseAdmin
      .from('provinces')
      .upsert({
        code: province.province_code,
        name: province.short_name || province.name,
        full_name: province.name,
        short_code: province.code,
        code_name: createSlug(province.short_name || province.name),
        place_type: province.place_type,
        region,
        lat,
        lng,
      }, { onConflict: 'code' });

    if (error) {
      console.error(`  Error: ${province.name} - ${error.message}`);
    } else {
      count++;
    }
  }

  console.log(`  ✓ Seeded ${count} provinces`);
  console.log(`    - ${fromJson} from dvhcvn.json coordinates`);
  console.log(`    - ${fromFallback} from fallback coordinates`);
  return count;
}

/**
 * Seed wards (xã/phường) - trực thuộc tỉnh
 * 
 * Logic tọa độ (ưu tiên từ cao xuống thấp):
 * 1. Tọa độ từ dvhcvn.json (nếu đã được enrich)
 * 2. Tọa độ tỉnh + jitter (fallback)
 * 
 * Đảm bảo: Phường/xã nằm trong đúng tỉnh/thành của nó
 */
async function seedWards(data) {
  console.log('Seeding wards (xã/phường)...');

  let count = 0;
  let fromJson = 0;
  let usedFallback = 0;

  for (const province of data) {
    // Lấy tọa độ tỉnh (ưu tiên từ json, fallback sang PROVINCE_COORDINATES)
    const provinceLat = province.lat || getProvinceCoordinates(province.province_code).lat;
    const provinceLng = province.lng || getProvinceCoordinates(province.province_code).lng;
    
    const wards = province.wards || [];

    for (const ward of wards) {
      let lat, lng;
      
      // Ưu tiên tọa độ từ dvhcvn.json
      if (ward.lat && ward.lng) {
        lat = ward.lat;
        lng = ward.lng;
        fromJson++;
      } else {
        // Fallback: dùng tọa độ tỉnh với jitter 10-15km
        // 0.12 độ ≈ 12km
        lat = provinceLat + (Math.random() - 0.5) * 0.24;
        lng = provinceLng + (Math.random() - 0.5) * 0.24;
        usedFallback++;
      }

      const { error } = await supabaseAdmin
        .from('wards')
        .upsert({
          code: ward.ward_code,
          name: ward.name,
          code_name: createSlug(ward.name),
          province_code: province.province_code,
          ward_type: getWardType(ward.name),
          lat,
          lng,
        }, { onConflict: 'code' });

      if (error) {
        console.error(`  Error: ${ward.name} - ${error.message}`);
      } else {
        count++;
      }
    }
  }

  console.log(`  ✓ Seeded ${count} wards`);
  console.log(`    - ${fromJson} from dvhcvn.json coordinates`);
  console.log(`    - ${usedFallback} used province fallback`);
  return count;
}

/**
 * Seed regional hubs (3 kho trung chuyển miền)
 */
async function seedRegionalHubs() {
  console.log('Creating regional hubs (kho trung chuyển miền)...');

  const hubs = [
    {
      code: 'REGIONAL-NORTH',
      name: 'Northern Regional Hub',
      name_vi: 'Kho trung chuyển miền Bắc',
      address: 'Khu công nghiệp Bắc Thăng Long, Hà Nội',
      district: 'Đông Anh',
      city: 'Hà Nội',
      region: 'north',
      lat: 21.1167,
      lng: 105.7833,
      office_type: 'regional',
      province_code: '01',
    },
    {
      code: 'REGIONAL-CENTRAL',
      name: 'Central Regional Hub',
      name_vi: 'Kho trung chuyển miền Trung',
      address: 'Khu công nghiệp Hòa Khánh, Đà Nẵng',
      district: 'Liên Chiểu',
      city: 'Đà Nẵng',
      region: 'central',
      lat: 16.0678,
      lng: 108.1500,
      office_type: 'regional',
      province_code: '48',
    },
    {
      code: 'REGIONAL-SOUTH',
      name: 'Southern Regional Hub',
      name_vi: 'Kho trung chuyển miền Nam',
      address: 'Khu công nghiệp Tân Bình, TP.HCM',
      district: 'Tân Phú',
      city: 'TP. Hồ Chí Minh',
      region: 'south',
      lat: 10.8000,
      lng: 106.6333,
      office_type: 'regional',
      province_code: '79',
    },
  ];

  for (const hub of hubs) {
    const { error } = await supabaseAdmin
      .from('post_offices')
      .upsert({ ...hub, is_active: true }, { onConflict: 'code' });

    if (error) {
      console.error(`  Error: ${hub.code} - ${error.message}`);
    }
  }

  console.log('  ✓ Regional hubs created');
}

/**
 * Seed post offices (bưu cục địa phương)
 * - Phường (đô thị): 2 bưu cục
 * - Xã (nông thôn): 1 bưu cục
 * 
 * Logic tọa độ:
 * 1. Lấy tọa độ phường/xã từ dvhcvn.json (đã được enrich)
 * 2. Bưu cục nằm trong phường/xã với jitter nhỏ (500m-1km)
 * 
 * Đảm bảo: Bưu cục nằm trong đúng phường/xã của nó
 */
async function seedPostOffices(data) {
  console.log('Creating post offices (bưu cục)...');

  let count = 0;
  let usedWardCoords = 0;
  let usedFallback = 0;

  for (const province of data) {
    // Lấy tọa độ tỉnh (ưu tiên từ json)
    const provinceLat = province.lat || getProvinceCoordinates(province.province_code).lat;
    const provinceLng = province.lng || getProvinceCoordinates(province.province_code).lng;
    
    const wards = province.wards || [];

    for (const ward of wards) {
      const wardType = getWardType(ward.name);
      // Phường (đô thị) = 2 bưu cục, Xã (nông thôn) = 1 bưu cục
      const officesPerWard = wardType === 'phuong' ? 2 : 1;

      for (let i = 1; i <= officesPerWard; i++) {
        const code = `${province.province_code}-${ward.ward_code}-${String(i).padStart(2, '0')}`;

        let lat, lng;

        // Ưu tiên tọa độ từ dvhcvn.json
        if (ward.lat && ward.lng) {
          // Bưu cục nằm trong phường/xã với jitter nhỏ (500m-1km)
          // 0.008 độ ≈ 800m
          lat = ward.lat + (Math.random() - 0.5) * 0.016;
          lng = ward.lng + (Math.random() - 0.5) * 0.016;
          usedWardCoords++;
        } else {
          // Fallback: dùng tọa độ tỉnh với jitter lớn hơn
          lat = provinceLat + (Math.random() - 0.5) * 0.15;
          lng = provinceLng + (Math.random() - 0.5) * 0.15;
          usedFallback++;
        }

        const { error } = await supabaseAdmin
          .from('post_offices')
          .upsert({
            code,
            name: `Post Office ${ward.name}${officesPerWard > 1 ? ` ${i}` : ''}`,
            name_vi: `Bưu cục ${ward.name}${officesPerWard > 1 ? ` ${i}` : ''}`,
            address: `${ward.name}, ${province.short_name || province.name}`,
            district: ward.name,
            city: province.short_name || province.name,
            region: getRegion(province.province_code),
            lat,
            lng,
            office_type: 'local',
            province_code: province.province_code,
            ward_code: ward.ward_code,
            is_active: true,
          }, { onConflict: 'code' });

        if (error) {
          console.error(`  Error: ${code} - ${error.message}`);
        } else {
          count++;
        }
      }
    }
  }

  console.log(`  ✓ Created ${count} post offices`);
  console.log(`    - ${usedWardCoords} used ward coordinates from dvhcvn.json`);
  console.log(`    - ${usedFallback} used province fallback`);
  return count;
}

/**
 * Main seed function
 */
async function seed() {
  console.log('='.repeat(60));
  console.log('Vietnam Administrative Data Seeder');
  console.log('Theo Công văn số 2896/BNV-CQĐP của Bộ Nội Vụ');
  console.log('Cấu trúc: Tỉnh/TP → Xã/Phường (không còn Quận/Huyện)');
  console.log('='.repeat(60));

  try {
    // Load JSON file
    const jsonPath = path.join(__dirname, '../../..', 'public/dvhcvn/dvhcvn.json');
    console.log(`\nLoading: ${jsonPath}`);

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File not found: ${jsonPath}`);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    const totalWards = data.reduce((sum, p) => sum + (p.wards?.length || 0), 0);
    console.log(`Found: ${data.length} provinces, ${totalWards} wards\n`);

    // 1. Seed provinces
    await seedProvinces(data);

    // 2. Seed wards
    await seedWards(data);

    // 3. Seed regional hubs
    await seedRegionalHubs();

    // 4. Seed post offices
    await seedPostOffices(data);

    console.log('\n' + '='.repeat(60));
    console.log('✓ Seeding completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n✗ Seeding failed:', error.message);
    process.exit(1);
  }
}

// Export
module.exports = { seed, seedProvinces, seedWards, seedPostOffices, seedRegionalHubs };

// Run if called directly
if (require.main === module) {
  seed().then(() => process.exit(0));
}
