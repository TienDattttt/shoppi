/**
 * Seed only provinces that have coordinates in dvhcvn.json
 * Skip provinces without lat/lng
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const fs = require('fs');
const path = require('path');

const REGION_MAPPING = {
  north: ['01', '02', '04', '06', '08', '10', '11', '12', '14', '15', '17', '19', '20', '22', '24', '25', '26', '27', '30', '31', '33', '34', '35', '36', '37'],
  central: ['38', '40', '42', '44', '45', '46', '48', '49', '51', '52', '54', '56', '58', '60', '62', '64', '66', '67', '68'],
  south: ['70', '72', '74', '75', '77', '79', '80', '82', '83', '84', '86', '87', '89', '91', '92', '93', '94', '95', '96'],
};

function getRegion(code) {
  for (const [region, codes] of Object.entries(REGION_MAPPING)) {
    if (codes.includes(code)) return region;
  }
  return 'south';
}

function createSlug(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getWardType(name) {
  return name.startsWith('Phường') ? 'phuong' : 'xa';
}

async function main() {
  console.log('='.repeat(60));
  console.log('Seed provinces with coordinates only');
  console.log('='.repeat(60));
  
  const jsonPath = path.join(__dirname, '../../..', 'public/dvhcvn/dvhcvn.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  // Filter provinces that have lat/lng and wards with coordinates
  const enrichedProvinces = data.filter(p => {
    if (!p.lat || !p.lng) return false;
    const wardsWithCoords = (p.wards || []).filter(w => w.lat && w.lng).length;
    return wardsWithCoords > 0;
  });
  
  // Skip TP.HCM (79) as it's already seeded
  const toSeed = enrichedProvinces.filter(p => p.province_code !== '79');
  
  console.log(`\nTotal provinces: ${data.length}`);
  console.log(`Enriched provinces: ${enrichedProvinces.length}`);
  console.log(`To seed (excluding HCM): ${toSeed.length}`);
  console.log('\nProvinces to seed:');
  toSeed.forEach(p => {
    const wardsWithCoords = (p.wards || []).filter(w => w.lat && w.lng).length;
    console.log(`  - ${p.name} (${wardsWithCoords}/${p.wards?.length || 0} wards with coords)`);
  });
  
  let totalWards = 0;
  let totalOffices = 0;
  
  for (let i = 0; i < toSeed.length; i++) {
    const province = toSeed[i];
    const code = province.province_code;
    const region = getRegion(code);
    
    console.log(`\n[${i + 1}/${toSeed.length}] ${province.name}`);
    
    // Seed province
    await supabaseAdmin.from('provinces').upsert({
      code,
      name: province.short_name || province.name,
      full_name: province.name,
      short_code: province.code,
      code_name: createSlug(province.short_name || province.name),
      place_type: province.place_type,
      region,
      lat: province.lat,
      lng: province.lng,
    }, { onConflict: 'code' });
    
    // Seed wards (only those with coordinates)
    const wardsWithCoords = (province.wards || []).filter(w => w.lat && w.lng);
    let wardCount = 0;
    
    for (const ward of wardsWithCoords) {
      const { error } = await supabaseAdmin.from('wards').upsert({
        code: ward.ward_code,
        name: ward.name,
        code_name: createSlug(ward.name),
        province_code: code,
        ward_type: getWardType(ward.name),
        lat: ward.lat,
        lng: ward.lng,
      }, { onConflict: 'code' });
      if (!error) wardCount++;
    }
    totalWards += wardCount;
    
    // Seed post offices
    let officeCount = 0;
    for (const ward of wardsWithCoords) {
      const wardType = getWardType(ward.name);
      const officesPerWard = wardType === 'phuong' ? 2 : 1;
      
      for (let j = 1; j <= officesPerWard; j++) {
        const officeCode = `${code}-${ward.ward_code}-${String(j).padStart(2, '0')}`;
        const lat = ward.lat + (Math.random() - 0.5) * 0.016;
        const lng = ward.lng + (Math.random() - 0.5) * 0.016;
        
        const { error } = await supabaseAdmin.from('post_offices').upsert({
          code: officeCode,
          name: `Post Office ${ward.name}${officesPerWard > 1 ? ` ${j}` : ''}`,
          name_vi: `Bưu cục ${ward.name}${officesPerWard > 1 ? ` ${j}` : ''}`,
          address: `${ward.name}, ${province.short_name || province.name}`,
          district: ward.name,
          city: province.short_name || province.name,
          region,
          lat, lng,
          office_type: 'local',
          province_code: code,
          ward_code: ward.ward_code,
          is_active: true,
        }, { onConflict: 'code' });
        if (!error) officeCount++;
      }
    }
    totalOffices += officeCount;
    
    console.log(`  ✓ ${wardCount} wards, ${officeCount} post offices`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Done!');
  console.log(`  Provinces: ${toSeed.length}`);
  console.log(`  Wards: ${totalWards}`);
  console.log(`  Post offices: ${totalOffices}`);
  console.log('='.repeat(60));
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
