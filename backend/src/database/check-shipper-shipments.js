/**
 * Check shipments for test shippers
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { supabaseAdmin } = require('../shared/supabase/supabase.client');

async function check() {
  const shipperAId = '02a9a385-e5e1-4d1a-9285-9e31f4c22ff2';
  const shipperBId = '440ac4da-16af-4d27-974c-71c142b1a099';
  
  // Check shipments for shipper A
  const { data: shipmentsA } = await supabaseAdmin
    .from('shipments')
    .select('id, tracking_number, status, shipper_id, pickup_contact_name')
    .eq('shipper_id', shipperAId);
  
  console.log('Shipments for Shipper A (0901111001):', shipmentsA?.length || 0);
  if (shipmentsA?.length) shipmentsA.forEach(s => console.log(' -', s.tracking_number, s.status));
  
  // Check shipments for shipper B
  const { data: shipmentsB } = await supabaseAdmin
    .from('shipments')
    .select('id, tracking_number, status, shipper_id, pickup_contact_name')
    .eq('shipper_id', shipperBId);
  
  console.log('\nShipments for Shipper B (0901111002):', shipmentsB?.length || 0);
  if (shipmentsB?.length) shipmentsB.forEach(s => console.log(' -', s.tracking_number, s.status));
  
  // Check all active shipments
  const { data: allActive } = await supabaseAdmin
    .from('shipments')
    .select('id, tracking_number, status, shipper_id')
    .in('status', ['assigned', 'picked_up', 'delivering']);
  
  console.log('\nAll active shipments:', allActive?.length || 0);
  if (allActive?.length) allActive.forEach(s => console.log(' -', s.tracking_number, s.status, 'shipper:', s.shipper_id));
}

check().catch(console.error);
