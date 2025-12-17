/**
 * useShipperTracking Hook
 * Real-time shipper location tracking via Socket.io
 * 
 * Usage:
 * const { shipperLocation, isConnected } = useShipperTracking(shipmentId);
 */

import { useEffect, useState, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export interface ShipperLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
}

interface UseShipperTrackingResult {
  shipperLocation: ShipperLocation | null;
  isConnected: boolean;
  error: string | null;
}

export function useShipperTracking(shipmentId: string | null): UseShipperTrackingResult {
  const socketRef = useRef<Socket | null>(null);
  const [shipperLocation, setShipperLocation] = useState<ShipperLocation | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to socket
  useEffect(() => {
    if (!shipmentId) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[ShipperTracking] Socket connected');
      setIsConnected(true);
      setError(null);
      
      // Join tracking room for this shipment
      newSocket.emit('tracking:join', { shipmentId });
    });

    newSocket.on('disconnect', () => {
      console.log('[ShipperTracking] Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err: Error) => {
      console.error('[ShipperTracking] Connection error:', err.message);
      setError('Không thể kết nối theo dõi real-time');
      setIsConnected(false);
    });

    // Listen for shipper location updates
    newSocket.on(`shipper:location:${shipmentId}`, (data: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
      timestamp?: string;
    }) => {
      console.log('[ShipperTracking] 🚚 Received location update:', data);
      setShipperLocation({
        lat: data.latitude,
        lng: data.longitude,
        heading: data.heading,
        speed: data.speed,
        updatedAt: data.timestamp || new Date().toISOString(),
      });
    });
    
    // Also listen for generic shipper:location event (in case server broadcasts differently)
    newSocket.on('shipper:location', (data: {
      shipmentId: string;
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
      timestamp?: string;
    }) => {
      if (data.shipmentId === shipmentId) {
        console.log('[ShipperTracking] 🚚 Received generic location update:', data);
        setShipperLocation({
          lat: data.latitude,
          lng: data.longitude,
          heading: data.heading,
          speed: data.speed,
          updatedAt: data.timestamp || new Date().toISOString(),
        });
      }
    });

    socketRef.current = newSocket;

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.emit('tracking:leave', { shipmentId });
        newSocket.disconnect();
      }
    };
  }, [shipmentId]);

  return {
    shipperLocation,
    isConnected,
    error,
  };
}

/**
 * Hook to track shipment status updates in real-time
 */
export interface ShipmentStatusUpdate {
  shipmentId: string;
  status: string;
  message?: string;
  timestamp: string;
}

export function useShipmentStatusTracking(
  shipmentId: string | null,
  onStatusUpdate?: (update: ShipmentStatusUpdate) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!shipmentId) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('tracking:join', { shipmentId });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for status updates
    newSocket.on('shipment:status', (data: ShipmentStatusUpdate) => {
      if (data.shipmentId === shipmentId && onStatusUpdate) {
        onStatusUpdate(data);
      }
    });

    socketRef.current = newSocket;

    return () => {
      if (newSocket) {
        newSocket.emit('tracking:leave', { shipmentId });
        newSocket.disconnect();
      }
    };
  }, [shipmentId, onStatusUpdate]);

  return { isConnected };
}
