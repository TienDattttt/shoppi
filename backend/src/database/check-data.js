/**
 * Script kiểm tra data trong database
 */

const { supabaseAdmin } = require('../shared/supabase/supabase.client');

async function checkData() {
  console.log('='.repeat(60));
  console.log('Checking database data...');
  console.log('='.repeat(60));

  // 1. Check provinces
  const { data: provinces, count: provinceCount } = await supabaseAdmin
    .from('provinces')
    .select('*', { count: 'exact' })
    .limit(5);
  console.log(`\n1. Provinces: ${provinceCount || 0} records`);
  if (provinces?.length) {
    console.log('   Sample:', provinces.slice(0, 3).map(p => p.name).join(', '));
  }

  // 2. Check wards
  const { count: wardCount } = await supabaseAdmin
    .from('wards')
    .select('*', { count: 'exact', head: true });
  console.log(`\n2. Wards: ${wardCount || 0} records`);

  // 3. Check post_offices
  const { data: offices, count: officeCount } = await supabaseAdmin
    .from('post_offices')
    .select('*', { count: 'exact' })
    .limit(10);
  console.log(`\n3. Post Offices: ${officeCount || 0} records`);
  
  // Regional hubs
  const { data: hubs } = await supabaseAdmin
    .from('post_offices')
    .select('*')
    .eq('office_type', 'regional');
  console.log(`   - Regional hubs: ${hubs?.length || 0}`);
  if (hubs?.length) {
    hubs.forEach(h => console.log(`     * ${h.name_vi} (${h.code})`));
  }

  // Local offices sample
  const { data: localOffices } = await supabaseAdmin
    .from('post_offices')
    .select('*')
    .eq('office_type', 'local')
    .limit(5);
  console.log(`   - Local offices sample:`);
  if (localOffices?.length) {
    localOffices.forEach(o => console.log(`     * ${o.name_vi} (${o.code})`));
  }

  // 4. Check shippers
  const { data: shippers, count: shipperCount } = await supabaseAdmin
    .from('shippers')
    .select(`
      *,
      user:users(id, full_name, phone),
      post_office:post_offices(id, name_vi, code)
    `, { count: 'exact' });
  console.log(`\n4. Shippers: ${shipperCount || 0} records`);
  
  if (shippers?.length) {
    console.log('   Details:');
    shippers.forEach(s => {
      console.log(`   - ${s.user?.full_name || 'N/A'} | status: ${s.status} | online: ${s.is_online} | available: ${s.is_available}`);
      console.log(`     post_office: ${s.post_office?.name_vi || 'NOT ASSIGNED'}`);
    });
  }

  // 5. Check shops
  const { data: shops, count: shopCount } = await supabaseAdmin
    .from('shops')
    .select('id, shop_name, address, lat, lng', { count: 'exact' })
    .limit(3);
  console.log(`\n5. Shops: ${shopCount || 0} records`);
  if (shops?.length) {
    shops.forEach(s => console.log(`   - ${s.shop_name} | lat: ${s.lat}, lng: ${s.lng}`));
  }

  // 6. Check shipments
  const { data: shipments, count: shipmentCount } = await supabaseAdmin
    .from('shipments')
    .select('id, tracking_number, status, shipper_id, pickup_office_id, delivery_office_id', { count: 'exact' })
    .limit(5);
  console.log(`\n6. Shipments: ${shipmentCount || 0} records`);
  if (shipments?.length) {
    shipments.forEach(s => console.log(`   - ${s.tracking_number} | status: ${s.status} | shipper: ${s.shipper_id ? 'assigned' : 'none'}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log('Done!');
  console.log('='.repeat(60));
}

checkData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
