/**
 * Enrich dvhcvn.json with Coordinates
 * 
 * Script này sẽ:
 * 1. Đọc file dvhcvn.json hiện tại
 * 2. Sử dụng Goong API để geocode tọa độ cho từng tỉnh/thành và phường/xã
 * 3. Lưu lại file dvhcvn.json với tọa độ đã bổ sung
 * 
 * Chạy: node enrich-dvhcvn-coordinates.js [province_code]
 * - Không có tham số: xử lý tất cả
 * - Có province_code: chỉ xử lý tỉnh đó (VD: 79 cho TP.HCM)
 */

const fs = require('fs');
const path = require('path');

// Goong API config
const GOONG_API_KEY = process.env.GOONG_API_KEY || 'z7e9UvBPWLUsg6K96UX5iWlf6BwwPMZofxeotMnM';
const GOONG_BASE_URL = 'https://rsapi.goong.io';

// Rate limiting
const API_DELAY_MS = 250; // 250ms between requests (4 requests/second)
const BATCH_SAVE_SIZE = 50; // Save after every 50 wards

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Geocode địa chỉ bằng Goong API
 */
async function geocode(address) {
  try {
    const url = new URL(`${GOONG_BASE_URL}/Geocode`);
    url.searchParams.append('api_key', GOONG_API_KEY);
    url.searchParams.append('address', address);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry?.location;
      if (location) {
        return {
          lat: location.lat,
          lng: location.lng,
          formatted_address: data.results[0].formatted_address,
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`  Geocode error for "${address}": ${error.message}`);
    return null;
  }
}

/**
 * Load dvhcvn.json
 */
function loadDvhcvn() {
  const filePath = path.join(__dirname, '../../..', 'public/dvhcvn/dvhcvn.json');
  const rawData = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(rawData);
}

/**
 * Save dvhcvn.json
 */
function saveDvhcvn(data) {
  const filePath = path.join(__dirname, '../../..', 'public/dvhcvn/dvhcvn.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`  💾 Saved to ${filePath}`);
}

/**
 * Enrich tọa độ cho một tỉnh
 */
async function enrichProvince(province) {
  const provinceName = province.name;
  
  // Geocode tỉnh nếu chưa có tọa độ
  if (!province.lat || !province.lng) {
    console.log(`  📍 Geocoding province: ${provinceName}`);
    const result = await geocode(`${provinceName}, Việt Nam`);
    if (result) {
      province.lat = result.lat;
      province.lng = result.lng;
      console.log(`    ✓ ${provinceName}: ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}`);
    } else {
      console.log(`    ✗ Failed to geocode: ${provinceName}`);
    }
    await sleep(API_DELAY_MS);
  }
  
  return province;
}

/**
 * Enrich tọa độ cho các phường/xã của một tỉnh
 */
async function enrichWards(province, onProgress) {
  const provinceName = province.short_name || province.name;
  const wards = province.wards || [];
  
  let enriched = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < wards.length; i++) {
    const ward = wards[i];
    
    // Skip nếu đã có tọa độ
    if (ward.lat && ward.lng) {
      skipped++;
      continue;
    }
    
    // Geocode phường/xã
    const searchAddress = `${ward.name}, ${provinceName}, Việt Nam`;
    const result = await geocode(searchAddress);
    
    if (result) {
      ward.lat = result.lat;
      ward.lng = result.lng;
      enriched++;
    } else {
      failed++;
      // Fallback: dùng tọa độ tỉnh với jitter nhỏ
      if (province.lat && province.lng) {
        ward.lat = province.lat + (Math.random() - 0.5) * 0.1;
        ward.lng = province.lng + (Math.random() - 0.5) * 0.1;
        ward.coords_fallback = true;
      }
    }
    
    await sleep(API_DELAY_MS);
    
    // Progress callback
    if (onProgress && (i + 1) % 10 === 0) {
      onProgress(i + 1, wards.length, enriched, failed);
    }
  }
  
  return { enriched, failed, skipped, total: wards.length };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const targetProvinceCode = args[0];
  
  console.log('='.repeat(60));
  console.log('Enrich dvhcvn.json with Coordinates');
  console.log('Using Goong.io API');
  console.log('='.repeat(60));
  
  if (!GOONG_API_KEY) {
    console.error('\n❌ GOONG_API_KEY not configured');
    process.exit(1);
  }
  
  // Load data
  console.log('\n📂 Loading dvhcvn.json...');
  const data = loadDvhcvn();
  console.log(`  Found ${data.length} provinces`);
  
  const totalWards = data.reduce((sum, p) => sum + (p.wards?.length || 0), 0);
  console.log(`  Total wards: ${totalWards}`);
  
  // Filter provinces if target specified
  let provincesToProcess = data;
  if (targetProvinceCode) {
    provincesToProcess = data.filter(p => p.province_code === targetProvinceCode);
    if (provincesToProcess.length === 0) {
      console.error(`\n❌ Province code "${targetProvinceCode}" not found`);
      process.exit(1);
    }
    console.log(`\n🎯 Processing only: ${provincesToProcess[0].name}`);
  }
  
  // Process each province
  let totalEnriched = 0;
  let totalFailed = 0;
  let processedWards = 0;
  
  for (let pIdx = 0; pIdx < provincesToProcess.length; pIdx++) {
    const province = provincesToProcess[pIdx];
    console.log(`\n[${pIdx + 1}/${provincesToProcess.length}] ${province.name}`);
    
    // Enrich province coordinates
    await enrichProvince(province);
    
    // Enrich ward coordinates
    const result = await enrichWards(province, (current, total, enriched, failed) => {
      process.stdout.write(`\r  Progress: ${current}/${total} wards (${enriched} enriched, ${failed} failed)`);
    });
    
    console.log(`\n  Summary: ${result.enriched} enriched, ${result.failed} failed, ${result.skipped} skipped`);
    
    totalEnriched += result.enriched;
    totalFailed += result.failed;
    processedWards += result.total;
    
    // Save periodically
    if ((pIdx + 1) % 5 === 0 || pIdx === provincesToProcess.length - 1) {
      saveDvhcvn(data);
    }
  }
  
  // Final save
  saveDvhcvn(data);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Completed!');
  console.log(`  Provinces processed: ${provincesToProcess.length}`);
  console.log(`  Wards processed: ${processedWards}`);
  console.log(`  Coordinates enriched: ${totalEnriched}`);
  console.log(`  Failed (used fallback): ${totalFailed}`);
  console.log('='.repeat(60));
}

// Export for use as module
module.exports = { geocode, enrichProvince, enrichWards, loadDvhcvn, saveDvhcvn };

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}
