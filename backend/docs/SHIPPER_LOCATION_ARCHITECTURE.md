# Shipper Location Tracking Architecture

## Overview

Hệ thống tracking vị trí shipper sử dụng kiến trúc hybrid để tối ưu chi phí và hiệu suất:

- **Redis**: Real-time location (GEO commands) - TTL 5 phút
- **Cassandra**: Lịch sử vị trí (time-series data)
- **Google Maps**: Hiển thị bản đồ + Navigation
- **Mapbox**: Backup cho routing/directions (có trong .env)
- **Supabase Realtime**: Broadcast location updates cho customer

## Data Flow

```
Mobile App (Geolocator)
    │
    ▼ POST /api/shipper/location (every 30s)
    │
Backend (location.service.js)
    │
    ├──► Redis (real-time)
    │    - GEO index: shipper:geo:locations
    │    - Location data: shipper:location:{id}
    │    - Online set: shipper:online
    │    - Available set: shipper:available
    │
    ├──► Cassandra (history)
    │    - Table: shipper_location_history
    │    - Partition: (shipper_id, date)
    │    - Cluster: timestamp DESC
    │
    └──► Supabase Realtime (broadcast)
         - Channel: shipment:{id}:location
```

## Redis Keys

| Key | Type | Purpose | TTL |
|-----|------|---------|-----|
| `shipper:geo:locations` | GEO | Spatial queries (nearby search) | - |
| `shipper:location:{id}` | STRING | Detailed location data | 5 min |
| `shipper:online` | SET | Online shippers | - |
| `shipper:available` | SET | Available shippers | - |
| `proximity:notified:{shipmentId}` | STRING | Prevent duplicate notifications | 24h |

## Cassandra Schema

```sql
CREATE TABLE shipper_location_history (
  shipper_id UUID,
  date DATE,
  timestamp TIMESTAMP,
  location_id UUID,
  lat DECIMAL,
  lng DECIMAL,
  accuracy FLOAT,
  speed FLOAT,
  heading FLOAT,
  shipment_id UUID,
  event_type TEXT,
  metadata TEXT,
  PRIMARY KEY ((shipper_id, date), timestamp, location_id)
) WITH CLUSTERING ORDER BY (timestamp DESC, location_id DESC);
```

## API Endpoints

### Update Location
```
POST /api/shipper/location
Body: { lat, lng, accuracy, speed, heading, shipmentId }
```

### Get Location History
```
GET /api/shipper/location/history
Query: date, startTime, endTime, limit
```

### Get Shipment Route
```
GET /api/shipper/shipments/:id/route
```

## Mobile Implementation

### Location Tracking Flow
1. Shipper toggles "Online" switch
2. `OnlineStatusCubit.goOnline()` called
3. Check GPS permission
4. Get current location
5. Call `POST /api/shipper/online`
6. Start `LocationCubit.startTracking()`
7. Geolocator streams position updates
8. Every 30s: `POST /api/shipper/location`

### Map Display (OpenStreetMap)
- Package: `flutter_map` + `latlong2`
- Tile URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- FREE - no API key required

### Navigation (Google Maps)
- Only used for turn-by-turn navigation
- Opens external Google Maps app
- `MapUtils.openNavigation(lat, lng)`

## Cost Optimization

| Feature | Before | After | Savings |
|---------|--------|-------|---------|
| Map Display | Google Maps API | OpenStreetMap | 100% |
| Real-time Location | Database queries | Redis GEO | ~90% latency |
| Location History | PostgreSQL | Cassandra | Better for time-series |
| Nearby Search | PostGIS | Redis GEOSEARCH | ~95% faster |

## Proximity Notification

When shipper is within 500m of delivery address:
1. `checkAndTriggerProximityNotifications()` called on location update
2. Check if notification already sent (Redis key)
3. Calculate distance using Haversine formula
4. If within threshold, publish `SHIPPER_NEARBY` event to RabbitMQ
5. Mark notification as sent (24h TTL)

## Files

### Backend
- `src/modules/shipper/location.service.js` - Main location service
- `src/shared/redis/shipper-location.cache.js` - Redis operations
- `src/shared/cassandra/shipper-tracking.cassandra.repository.js` - Cassandra operations

### Mobile
- `lib/features/location/` - Location feature module
- `lib/shared/widgets/osm_map_widget.dart` - Reusable OSM map widget
- `lib/features/shipment/presentation/pages/shipment_detail_page.dart` - Uses Flutter Map
