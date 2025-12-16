/**
 * Enrich ALL provinces with coordinates
 * Chạy tuần tự từng tỉnh để tránh rate limit
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  // Load dvhcvn.json to get province codes
  const jsonPath = path.join(__dirname, '../../..', 'public/dvhcvn/dvhcvn.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const provinceCodes = data.map(p => p.province_code);
  
  console.log('='.repeat(60));
  console.log(`Enriching ${provinceCodes.length} provinces`);
  console.log('='.repeat(60));
  
  for (let i = 0; i < provinceCodes.length; i++) {
    const code = provinceCodes[i];
    const province = data.find(p => p.province_code === code);
    
    // Skip if already has coordinates for all wards
    const wardsWithCoords = (province.wards || []).filter(w => w.lat && w.lng).length;
    const totalWards = (province.wards || []).length;
    
    if (wardsWithCoords === totalWards && province.lat && province.lng) {
      console.log(`[${i + 1}/${provinceCodes.length}] ${province.name} - Already enriched (${totalWards} wards), skipping...`);
      continue;
    }
    
    console.log(`\n[${i + 1}/${provinceCodes.length}] Processing: ${province.name} (${totalWards - wardsWithCoords} wards need coordinates)`);
    
    try {
      execSync(`node src/database/seeds/enrich-dvhcvn-coordinates.js ${code}`, {
        cwd: path.join(__dirname, '../../..'),
        stdio: 'inherit',
        timeout: 600000, // 10 minutes per province
      });
    } catch (error) {
      console.error(`  Error processing ${code}: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All provinces processed!');
  console.log('='.repeat(60));
}

main().catch(console.error);
