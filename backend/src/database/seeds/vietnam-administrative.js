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

// Tọa độ trung tâm các tỉnh/thành phố
const PROVINCE_COORDINATES = {
  '01': { lat: 21.0285, lng: 105.8542 }, // Hà Nội
  '04': { lat: 22.6657, lng: 106.2522 }, // Cao Bằng
  '08': { lat: 21.8237, lng: 105.2140 }, // Tuyên Quang (bao gồm Hà Giang cũ)
  '10': { lat: 22.3380, lng: 103.8440 }, // Lào Cai
  '14': { lat: 21.3256, lng: 103.9188 }, // Sơn La
  '19': { lat: 21.5928, lng: 105.8442 }, // Thái Nguyên
  '22': { lat: 21.0064, lng: 107.2925 }, // Quảng Ninh
  '24': { lat: 21.2820, lng: 106.1975 }, // Bắc Giang
  '27': { lat: 21.1861, lng: 106.0763 }, // Bắc Ninh
  '31': { lat: 20.8449, lng: 106.6881 }, // Hải Phòng
  '38': { lat: 19.8067, lng: 105.7852 }, // Thanh Hóa
  '40': { lat: 18.6796, lng: 105.6813 }, // Nghệ An
  '46': { lat: 16.4637, lng: 107.5909 }, // Thừa Thiên Huế
  '48': { lat: 16.0544, lng: 108.2022 }, // Đà Nẵng
  '56': { lat: 12.2388, lng: 109.1967 }, // Khánh Hòa
  '68': { lat: 11.9404, lng: 108.4583 }, // Lâm Đồng
  '74': { lat: 10.9804, lng: 106.6519 }, // Bình Dương
  '75': { lat: 10.9574, lng: 106.8426 }, // Đồng Nai
  '77': { lat: 10.4114, lng: 107.1362 }, // Bà Rịa - Vũng Tàu
  '79': { lat: 10.8231, lng: 106.6297 }, // TP.HCM
  '92': { lat: 10.0452, lng: 105.7469 }, // Cần Thơ
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
 */
async function seedProvinces(data) {
  console.log('Seeding provinces (tỉnh/thành phố)...');
  
  let count = 0;
  for (const province of data) {
    const coords = getProvinceCoordinates(province.province_code);
    const region = getRegion(province.province_code);
    
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
        lat: coords.lat,
        lng: coords.lng,
      }, { onConflict: 'code' });
    
    if (error) {
      console.error(`  Error: ${province.name} - ${error.message}`);
    } else {
      count++;
    }
  }
  
  console.log(`  ✓ Seeded ${count} provinces`);
  return count;
}

/**
 * Seed wards (xã/phường) - trực thuộc tỉnh
 */
async function seedWards(data) {
  console.log('Seeding wards (xã/phường)...');
  
  let count = 0;
  for (const province of data) {
    const provinceCoords = getProvinceCoordinates(province.province_code);
    const wards = province.wards || [];
    
    for (const ward of wards) {
      // Tọa độ gần tỉnh với offset nhỏ
      const lat = provinceCoords.lat + (Math.random() - 0.5) * 0.3;
      const lng = provinceCoords.lng + (Math.random() - 0.5) * 0.3;
      
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
    
    console.log(`  ${province.short_name || province.name}: ${wards.length} wards`);
  }
  
  console.log(`  ✓ Seeded ${count} wards`);
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
 */
async function seedPostOffices(data) {
  console.log('Creating post offices (bưu cục)...');
  
  let count = 0;
  
  for (const province of data) {
    const provinceCoords = getProvinceCoordinates(province.province_code);
    const wards = province.wards || [];
    let provinceCount = 0;
    
    for (const ward of wards) {
      const wardType = getWardType(ward.name);
      // Phường (đô thị) = 2 bưu cục, Xã (nông thôn) = 1 bưu cục
      const officesPerWard = wardType === 'phuong' ? 2 : 1;
      
      for (let i = 1; i <= officesPerWard; i++) {
        const code = `${province.province_code}-${ward.ward_code}-${String(i).padStart(2, '0')}`;
        
        const lat = provinceCoords.lat + (Math.random() - 0.5) * 0.2;
        const lng = provinceCoords.lng + (Math.random() - 0.5) * 0.2;
        
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
          provinceCount++;
        }
      }
    }
    
    console.log(`  ${province.short_name || province.name}: ${provinceCount} offices`);
  }
  
  console.log(`  ✓ Created ${count} post offices`);
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
