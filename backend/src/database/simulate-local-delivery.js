/**
 * Simulate Local Delivery - Shipper moving along actual route
 * This simulates a shipper delivering along the real road route from Goong API
 * 
 * Usage: node src/database/simulate-local-delivery.js <shipmentId>
 */

require('dotenv').config();

const { supabaseAdmin } = require('../shared/supabase/supabase.client');
const locationService = require('../modules/shipper/location.service');
const goongClient = require('../shared/goong/goong.client');
const { io } = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';

async function simulateLocalDelivery(shipmentId) {
  console.log('🚚 Simulating local delivery for shipment:', shipmentId);
  
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
  
  // Use delivery location as destination
  const deliveryLat = parseFloat(shipment.delivery_lat) || 21.0294524;
  const deliveryLng = parseFloat(shipment.delivery_lng) || 105.8213829;
  
  // Start 2km away from delivery point (simulate local delivery)
  const startLat = deliveryLat - 0.018; // ~2km south
  const startLng = deliveryLng + 0.005; // slightly east
  
  console.log('📍 Start (2km away):', { lat: startLat, lng: startLng });
  console.log('📍 Delivery:', { lat: deliveryLat, lng: deliveryLng });
  
  // Get actual route from Goong Directions API
  console.log('\n🗺️ Fetching route from Goong Directions API...');
  const route = await goongClient.getDirections(startLat, startLng, deliveryLat, deliveryLng, 'bike');
  
  if (!route || !route.polylinePoints || route.polylinePoints.length === 0) {
    console.error('❌ Failed to get route from Goong API, falling back to straight line');
    // Fallback to straight line
    route.polylinePoints = [
      { lat: startLat, lng: startLng },
      { lat: deliveryLat, lng: deliveryLng },
    ];
  }
  
  console.log(`✅ Got route with ${route.polylinePoints.length} points`);
  console.log(`📏 Distance: ${route.distance?.text || 'N/A'}, Duration: ${route.duration?.text || 'N/A'}`);
  
  // Sample points from route (take every Nth point to get ~30-50 steps)
  const totalPoints = route.polylinePoints.length;
  const targetSteps = Math.min(50, totalPoints);
  const stepSize = Math.max(1, Math.floor(totalPoints / targetSteps));
  
  const routePoints = [];
  for (let i = 0; i < totalPoints; i += stepSize) {
    routePoints.push(route.polylinePoints[i]);
  }
  // Always include the last point (destination)
  if (routePoints[routePoints.length - 1] !== route.polylinePoints[totalPoints - 1]) {
    routePoints.push(route.polylinePoints[totalPoints - 1]);
  }
  
  console.log(`📍 Simulating ${routePoints.length} waypoints along the route`);
  
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
  
  // Simulate movement along route
  const intervalMs = 1000; // 1 second between updates
  let currentStep = 0;
  
  const interval = setInterval(async () => {
    if (currentStep >= routePoints.length) {
      console.log('\n✅ Simulation complete! Shipper arrived at delivery location.');
      clearInterval(interval);
      socket.disconnect();
      process.exit(0);
    }
    
    const currentPoint = routePoints[currentStep];
    const nextPoint = routePoints[Math.min(currentStep + 1, routePoints.length - 1)];
    
    // Calculate heading (direction to next point)
    const heading = Math.atan2(
      nextPoint.lng - currentPoint.lng,
      nextPoint.lat - currentPoint.lat
    ) * 180 / Math.PI;
    
    // Random speed between 15-35 km/h (city traffic)
    const speed = 15 + Math.random() * 20;
    
    // Calculate remaining distance to destination
    const remainingKm = calculateDistance(
      currentPoint.lat, currentPoint.lng,
      deliveryLat, deliveryLng
    );
    
    console.log(`\n📍 Step ${currentStep + 1}/${routePoints.length}: (${currentPoint.lat.toFixed(6)}, ${currentPoint.lng.toFixed(6)}) - ${speed.toFixed(1)} km/h - ${(remainingKm * 1000).toFixed(0)}m remaining`);
    
    // Update location via Redis + Socket.io
    try {
      await locationService.updateLocation(
        shipment.shipper_id,
        currentPoint.lat,
        currentPoint.lng,
        {
          heading,
          speed,
          accuracy: 10,
          shipmentId,
        }
      );
      console.log('  ✅ Location updated in Redis + Socket.io');
    } catch (err) {
      console.error('  ❌ Failed to update location:', err.message);
    }
    
    // Also emit directly via Socket.io (backup)
    socket.emit('shipper:location', {
      shipmentId,
      shipperId: shipment.shipper_id,
      latitude: currentPoint.lat,
      longitude: currentPoint.lng,
      heading,
      speed,
      timestamp: new Date().toISOString(),
    });
    
    currentStep++;
  }, intervalMs);
  
  console.log(`\n🚀 Starting route simulation: ${routePoints.length} waypoints, ${intervalMs}ms interval`);
  console.log('Press Ctrl+C to stop\n');
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get shipment ID from command line
const shipmentId = process.argv[2];

if (!shipmentId) {
  console.log('Usage: node src/database/simulate-local-delivery.js <shipmentId>');
  console.log('Example: node src/database/simulate-local-delivery.js 75aca54d-dfce-4128-8ebe-2f95f21b7472');
  process.exit(1);
}

simulateLocalDelivery(shipmentId);
