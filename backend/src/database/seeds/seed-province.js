/**
 * Seed single province data
 * 
 * Chạy: node seed-province.js <province_code>
 * VD: node seed-province.js 79
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const fs = require('fs');
const path = require('path');

// Phân vùng miền theo mã tỉnh
const REGION_MAPPING = {
  north: ['01', '02', '04', '06', '08', '10', '11', '12', '14', '15', '17', '19', '20', '22', '24', '25', '26', '27', '30', '31', '33', '34', '35', '36', '37'],
  central: ['38', '40', '42', '44', '45', '46', '48', '49', '51', '52', '54', '56', '58', '60', '62', '64', '66', '67', '68'],
  south: ['70', '72', '74', '75', '77', '79', '80', '82', '83', '84', '86', '87', '89', '91', '92', '93', '94', '95', '96'],
};

function getRegion(provinceCode) {
  for (const [region, codes] of Object.entries(REGION_MAPPING)) {
    if (codes.includes(provinceCode)) return region;
  }
  return 'south';
}

function createSlug(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getWardType(wardName) {
  if (wardName.startsWith('Phường')) return 'phuong';
  return 'xa';
}

async function seedProvince(provinceCode) {
  console.log(`\n🏙️ Seeding province: ${provinceCode}`);
  
  // Load dvhcvn.json
  const jsonPath = path.join(__dirname, '../../..', 'public/dvhcvn/dvhcvn.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const province = data.find(p => p.province_code === provinceCode);
  if (!province) {
    console.error(`Province ${provinceCode} not found!`);
    return;
  }
  
  console.log(`  Province: ${province.name}`);
  console.log(`  Wards: ${province.wards?.length || 0}`);
  
  // 1. Seed province
  const region = getRegion(provinceCode);
  const { error: pError } = await supabaseAdmin
    .from('provinces')
    .upsert({
      code: province.province_code,
      name: province.short_name || province.name,
      full_name: province.name,
      short_code: province.code,
      code_name: createSlug(province.short_name || province.name),
      place_type: province.place_type,
      region,
      lat: province.lat || 10.8231,
      lng: province.lng || 106.6297,
    }, { onConflict: 'code' });
  
  if (pError) console.error('  Province error:', pError.message);
  else console.log('  ✓ Province seeded');
  
  // 2. Seed wards
  let wardCount = 0;
  let wardWithCoords = 0;
  
  for (const ward of province.wards || []) {
    let lat = ward.lat;
    let lng = ward.lng;
    
    if (!lat || !lng) {
      // Fallback to province coords with jitter
      lat = (province.lat || 10.8231) + (Math.random() - 0.5) * 0.2;
      lng = (province.lng || 106.6297) + (Math.random() - 0.5) * 0.2;
    } else {
      wardWithCoords++;
    }
    
    const { error } = await supabaseAdmin
      .from('wards')
      .upsert({
        code: ward.ward_code,
        name: ward.name,
        code_name: createSlug(ward.name),
        province_code: provinceCode,
        ward_type: getWardType(ward.name),
        lat,
        lng,
      }, { onConflict: 'code' });
    
    if (!error) wardCount++;
  }
  
  console.log(`  ✓ ${wardCount} wards seeded (${wardWithCoords} with coordinates)`);
  
  // 3. Seed post offices
  let officeCount = 0;
  
  for (const ward of province.wards || []) {
    const wardType = getWardType(ward.name);
    const officesPerWard = wardType === 'phuong' ? 2 : 1;
    
    for (let i = 1; i <= officesPerWard; i++) {
      const code = `${provinceCode}-${ward.ward_code}-${String(i).padStart(2, '0')}`;
      
      let lat, lng;
      if (ward.lat && ward.lng) {
        lat = ward.lat + (Math.random() - 0.5) * 0.016;
        lng = ward.lng + (Math.random() - 0.5) * 0.016;
      } else {
        lat = (province.lat || 10.8231) + (Math.random() - 0.5) * 0.15;
        lng = (province.lng || 106.6297) + (Math.random() - 0.5) * 0.15;
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
          region,
          lat,
          lng,
          office_type: 'local',
          province_code: provinceCode,
          ward_code: ward.ward_code,
          is_active: true,
        }, { onConflict: 'code' });
      
      if (!error) officeCount++;
    }
  }
  
  console.log(`  ✓ ${officeCount} post offices seeded`);
  console.log('\n✅ Done!');
}

// Run
const provinceCode = process.argv[2];
if (!provinceCode) {
  console.log('Usage: node seed-province.js <province_code>');
  console.log('Example: node seed-province.js 79');
  process.exit(1);
}

seedProvince(provinceCode)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
