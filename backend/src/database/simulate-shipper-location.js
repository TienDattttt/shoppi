/**
 * Simulate Shipper Location Updates
 * This script simulates a shipper moving from pickup to delivery location
 * 
 * Usage: node src/database/simulate-shipper-location.js <shipmentId>
 * Example: node src/database/simulate-shipper-location.js 75aca54d-dfce-4128-8ebe-2f95f21b7472
 */

require('dotenv').config();

const { supabaseAdmin } = require('../shared/supabase/supabase.client');
const locationService = require('../modules/shipper/location.service');
const { io } = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';

async function simulateShipperLocation(shipmentId) {
  console.log('🚚 Simulating shipper location for shipment:', shipmentId);
  
  // Get shipment details
  const { data: shipment, error } = await supabaseAdmin
    .from('shipments')
    .select('*, shipper:shippers!shipments_shipper_id_fkey(*)')
    .eq('id', shipmentId)
    .single();
  
  if (error || !shipment) {
    console.error('❌ Shipment not found:', error?.message);
    process.exit(1);
  }
  
  if (!shipment.shipper_id) {
    console.error('❌ No shipper assigned to this shipment');
    process.exit(1);
  }
  
  console.log('📦 Shipment:', {
    trackingNumber: shipment.tracking_number,
    status: shipment.status,
    shipperId: shipment.shipper_id,
  });
  
  // Get pickup and delivery coordinates
  const pickupLat = parseFloat(shipment.pickup_lat) || 10.8231;
  const pickupLng = parseFloat(shipment.pickup_lng) || 106.6297;
  const deliveryLat = parseFloat(shipment.delivery_lat) || 10.7769;
  const deliveryLng = parseFloat(shipment.delivery_lng) || 106.6910;
  
  console.log('📍 Pickup:', { lat: pickupLat, lng: pickupLng });
  console.log('📍 Delivery:', { lat: deliveryLat, lng: deliveryLng });
  
  // Connect to Socket.io
  const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to Socket.io server');
  });
  
  socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message);
  });
  
  // Simulate movement from pickup to delivery
  const steps = 20; // Number of steps
  const intervalMs = 2000; // 2 seconds between updates
  
  let currentStep = 0;
  
  const interval = setInterval(async () => {
    if (currentStep >= steps) {
      console.log('\n✅ Simulation complete! Shipper arrived at delivery location.');
      clearInterval(interval);
      socket.disconnect();
      process.exit(0);
    }
    
    // Calculate current position (linear interpolation)
    const progress = currentStep / steps;
    const currentLat = pickupLat + (deliveryLat - pickupLat) * progress;
    const currentLng = pickupLng + (deliveryLng - pickupLng) * progress;
    
    // Calculate heading (direction of movement)
    const heading = Math.atan2(deliveryLng - pickupLng, deliveryLat - pickupLat) * 180 / Math.PI;
    
    // Random speed between 20-40 km/h
    const speed = 20 + Math.random() * 20;
    
    console.log(`\n📍 Step ${currentStep + 1}/${steps}: (${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}) - ${speed.toFixed(1)} km/h`);
    
    // Update location via Redis
    try {
      await locationService.updateLocation(
        shipment.shipper_id,
        currentLat,
        currentLng,
        {
          heading,
          speed,
          accuracy: 10,
          shipmentId,
        }
      );
      console.log('  ✅ Location updated in Redis');
    } catch (err) {
      console.error('  ❌ Failed to update Redis:', err.message);
    }
    
    // Emit via Socket.io
    socket.emit('shipper:location', {
      shipmentId,
      shipperId: shipment.shipper_id,
      latitude: currentLat,
      longitude: currentLng,
      heading,
      speed,
      timestamp: new Date().toISOString(),
    });
    console.log('  ✅ Location emitted via Socket.io');
    
    currentStep++;
  }, intervalMs);
  
  console.log(`\n🚀 Starting simulation: ${steps} steps, ${intervalMs}ms interval`);
  console.log('Press Ctrl+C to stop\n');
}

// Get shipment ID from command line
const shipmentId = process.argv[2];

if (!shipmentId) {
  console.log('Usage: node src/database/simulate-shipper-location.js <shipmentId>');
  console.log('Example: node src/database/simulate-shipper-location.js 75aca54d-dfce-4128-8ebe-2f95f21b7472');
  process.exit(1);
}

simulateShipperLocation(shipmentId);
