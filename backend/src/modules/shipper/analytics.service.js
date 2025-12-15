/**
 * Delivery Analytics Service
 * Business logic for delivery analytics and reporting
 * 
 * Requirements: 16.1, 16.2, 16.4 (Delivery Analytics Dashboard)
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

// ============================================
// DELIVERY COUNTS
// ============================================

/**
 * Get delivery counts for a specific period
 * Requirements: 16.1 - Display daily/weekly/monthly delivery counts
 * 
 * @param {string} period - 'daily' | 'weekly' | 'monthly'
 * @param {Date} [startDate] - Optional start date
 * @param {Date} [endDate] - Optional end date
 * @returns {Promise<Object>}
 */
async function getDeliveryCounts(period = 'daily', startDate = null, endDate = null) {
  const now = new Date();
  
  // Set default date range based on period
  if (!startDate) {
    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // Last 12 weeks
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1); // Last 12 months
        break;
    }
  }
  if (!endDate) {
    endDate = now;
  }

  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('id, status, created_at, delivered_at, shipping_fee, cod_amount')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    throw new Error(`Failed to get delivery counts: ${error.message}`);
  }

  const shipments = data || [];
  
  // Group by period
  const grouped = groupByPeriod(shipments, period);
  
  return {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    data: grouped,
    summary: calculateSummary(shipments),
  };
}


/**
 * Group shipments by period (daily/weekly/monthly)
 * @param {Object[]} shipments
 * @param {string} period
 * @returns {Object[]}
 */
function groupByPeriod(shipments, period) {
  const groups = {};
  
  shipments.forEach(shipment => {
    const date = new Date(shipment.created_at);
    let key;
    
    switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'weekly':
        // Get ISO week number
        const weekStart = getWeekStart(date);
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }
    
    if (!groups[key]) {
      groups[key] = {
        period: key,
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        cancelled: 0,
        revenue: 0,
        codCollected: 0,
      };
    }
    
    groups[key].total++;
    
    switch (shipment.status) {
      case 'delivered':
        groups[key].delivered++;
        groups[key].revenue += parseFloat(shipment.shipping_fee || 0);
        groups[key].codCollected += parseFloat(shipment.cod_amount || 0);
        break;
      case 'failed':
        groups[key].failed++;
        break;
      case 'cancelled':
        groups[key].cancelled++;
        break;
      default:
        groups[key].pending++;
    }
  });
  
  // Convert to array and sort by period
  return Object.values(groups)
    .map(g => ({
      ...g,
      successRate: g.total > 0 ? Math.round((g.delivered / g.total) * 100 * 10) / 10 : 0,
      revenue: Math.round(g.revenue * 100) / 100,
      codCollected: Math.round(g.codCollected * 100) / 100,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Get the start of the week (Monday) for a given date
 * @param {Date} date
 * @returns {Date}
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Calculate summary statistics
 * @param {Object[]} shipments
 * @returns {Object}
 */
function calculateSummary(shipments) {
  const total = shipments.length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const failed = shipments.filter(s => s.status === 'failed').length;
  const cancelled = shipments.filter(s => s.status === 'cancelled').length;
  const pending = total - delivered - failed - cancelled;
  
  const revenue = shipments
    .filter(s => s.status === 'delivered')
    .reduce((sum, s) => sum + parseFloat(s.shipping_fee || 0), 0);
  
  const codCollected = shipments
    .filter(s => s.status === 'delivered')
    .reduce((sum, s) => sum + parseFloat(s.cod_amount || 0), 0);
  
  return {
    total,
    delivered,
    failed,
    cancelled,
    pending,
    successRate: total > 0 ? Math.round((delivered / total) * 100 * 10) / 10 : 0,
    failureRate: total > 0 ? Math.round((failed / total) * 100 * 10) / 10 : 0,
    revenue: Math.round(revenue * 100) / 100,
    codCollected: Math.round(codCollected * 100) / 100,
  };
}


// ============================================
// SUCCESS RATE AND FAILURE BREAKDOWN
// ============================================

/**
 * Get success rate and failure breakdown
 * Requirements: 16.2 - Show success rate, average delivery time, and failure reasons breakdown
 * 
 * @param {Date} [startDate]
 * @param {Date} [endDate]
 * @returns {Promise<Object>}
 */
async function getSuccessRateAndFailures(startDate = null, endDate = null) {
  const now = new Date();
  if (!startDate) {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (!endDate) {
    endDate = now;
  }

  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('id, status, failure_reason, created_at, delivered_at, estimated_delivery')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    throw new Error(`Failed to get success rate: ${error.message}`);
  }

  const shipments = data || [];
  const completedShipments = shipments.filter(s => s.status === 'delivered' || s.status === 'failed');
  const deliveredShipments = shipments.filter(s => s.status === 'delivered');
  const failedShipments = shipments.filter(s => s.status === 'failed');

  // Calculate average delivery time
  const deliveryTimes = deliveredShipments
    .filter(s => s.delivered_at && s.created_at)
    .map(s => {
      const created = new Date(s.created_at);
      const delivered = new Date(s.delivered_at);
      return (delivered - created) / (1000 * 60 * 60); // Hours
    });
  
  const avgDeliveryTime = deliveryTimes.length > 0
    ? Math.round((deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length) * 10) / 10
    : 0;

  // Calculate on-time rate
  const onTimeDeliveries = deliveredShipments.filter(s => {
    if (!s.delivered_at || !s.estimated_delivery) return false;
    return new Date(s.delivered_at) <= new Date(s.estimated_delivery);
  }).length;
  
  const onTimeRate = deliveredShipments.length > 0
    ? Math.round((onTimeDeliveries / deliveredShipments.length) * 100 * 10) / 10
    : 0;

  // Group failure reasons
  const failureReasons = {};
  failedShipments.forEach(s => {
    const reason = s.failure_reason || 'Không xác định';
    failureReasons[reason] = (failureReasons[reason] || 0) + 1;
  });

  const failureBreakdown = Object.entries(failureReasons)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: failedShipments.length > 0 
        ? Math.round((count / failedShipments.length) * 100 * 10) / 10 
        : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalShipments: shipments.length,
    completedShipments: completedShipments.length,
    deliveredShipments: deliveredShipments.length,
    failedShipments: failedShipments.length,
    successRate: completedShipments.length > 0
      ? Math.round((deliveredShipments.length / completedShipments.length) * 100 * 10) / 10
      : 0,
    avgDeliveryTimeHours: avgDeliveryTime,
    onTimeRate,
    failureBreakdown,
  };
}


// ============================================
// ZONE-BASED ANALYTICS
// ============================================

/**
 * Get zone-based delivery analytics
 * Requirements: 16.4 - Display delivery volume and performance by geographic area
 * 
 * @param {Date} [startDate]
 * @param {Date} [endDate]
 * @returns {Promise<Object>}
 */
async function getZoneAnalytics(startDate = null, endDate = null) {
  const now = new Date();
  if (!startDate) {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (!endDate) {
    endDate = now;
  }

  // Get shipments with zone info
  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('id, status, shipping_fee, delivery_address, created_at, delivered_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    throw new Error(`Failed to get zone analytics: ${error.message}`);
  }

  const shipments = data || [];
  
  // Extract city/district from delivery address
  const zoneStats = {};
  
  shipments.forEach(shipment => {
    // Parse address to extract zone (city/district)
    const zone = extractZoneFromAddress(shipment.delivery_address);
    
    if (!zoneStats[zone]) {
      zoneStats[zone] = {
        zone,
        total: 0,
        delivered: 0,
        failed: 0,
        revenue: 0,
        avgDeliveryTime: [],
      };
    }
    
    zoneStats[zone].total++;
    
    if (shipment.status === 'delivered') {
      zoneStats[zone].delivered++;
      zoneStats[zone].revenue += parseFloat(shipment.shipping_fee || 0);
      
      if (shipment.delivered_at && shipment.created_at) {
        const deliveryTime = (new Date(shipment.delivered_at) - new Date(shipment.created_at)) / (1000 * 60 * 60);
        zoneStats[zone].avgDeliveryTime.push(deliveryTime);
      }
    } else if (shipment.status === 'failed') {
      zoneStats[zone].failed++;
    }
  });

  // Calculate final stats for each zone
  const zoneAnalytics = Object.values(zoneStats)
    .map(zone => ({
      zone: zone.zone,
      total: zone.total,
      delivered: zone.delivered,
      failed: zone.failed,
      successRate: zone.total > 0 ? Math.round((zone.delivered / zone.total) * 100 * 10) / 10 : 0,
      revenue: Math.round(zone.revenue * 100) / 100,
      avgDeliveryTimeHours: zone.avgDeliveryTime.length > 0
        ? Math.round((zone.avgDeliveryTime.reduce((a, b) => a + b, 0) / zone.avgDeliveryTime.length) * 10) / 10
        : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalZones: zoneAnalytics.length,
    zones: zoneAnalytics,
  };
}

/**
 * Extract zone (city/district) from address string
 * @param {string} address
 * @returns {string}
 */
function extractZoneFromAddress(address) {
  if (!address) return 'Không xác định';
  
  // Common Vietnamese city/district patterns
  const patterns = [
    /(?:Quận|Q\.|Huyện|H\.|Thị xã|TX\.)\s*([^,]+)/i,
    /(?:TP\.|Thành phố)\s*([^,]+)/i,
    /(?:Tỉnh)\s*([^,]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  // Fallback: try to extract last meaningful part
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 2]; // Usually district/city is second to last
  }
  
  return 'Không xác định';
}


// ============================================
// DASHBOARD OVERVIEW
// ============================================

/**
 * Get comprehensive analytics dashboard data
 * Requirements: 16.1, 16.2, 16.4
 * 
 * @param {Date} [startDate]
 * @param {Date} [endDate]
 * @returns {Promise<Object>}
 */
async function getDashboardAnalytics(startDate = null, endDate = null) {
  const now = new Date();
  if (!startDate) {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (!endDate) {
    endDate = now;
  }

  // Get all analytics in parallel
  const [deliveryCounts, successRateData, zoneData] = await Promise.all([
    getDeliveryCounts('daily', startDate, endDate),
    getSuccessRateAndFailures(startDate, endDate),
    getZoneAnalytics(startDate, endDate),
  ]);

  // Get today's stats
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStats = await getTodayStats(todayStart);

  // Get comparison with previous period
  const periodLength = endDate - startDate;
  const prevStartDate = new Date(startDate.getTime() - periodLength);
  const prevEndDate = new Date(startDate.getTime() - 1);
  
  const prevPeriodStats = await getSuccessRateAndFailures(prevStartDate, prevEndDate);

  // Calculate growth rates
  const deliveryGrowth = prevPeriodStats.totalShipments > 0
    ? Math.round(((successRateData.totalShipments - prevPeriodStats.totalShipments) / prevPeriodStats.totalShipments) * 100 * 10) / 10
    : 0;

  const successRateChange = prevPeriodStats.successRate > 0
    ? Math.round((successRateData.successRate - prevPeriodStats.successRate) * 10) / 10
    : 0;

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    today: todayStats,
    overview: {
      totalShipments: successRateData.totalShipments,
      deliveredShipments: successRateData.deliveredShipments,
      failedShipments: successRateData.failedShipments,
      successRate: successRateData.successRate,
      avgDeliveryTimeHours: successRateData.avgDeliveryTimeHours,
      onTimeRate: successRateData.onTimeRate,
    },
    comparison: {
      deliveryGrowth,
      successRateChange,
      previousPeriod: {
        totalShipments: prevPeriodStats.totalShipments,
        successRate: prevPeriodStats.successRate,
      },
    },
    dailyTrend: deliveryCounts.data,
    failureBreakdown: successRateData.failureBreakdown,
    topZones: zoneData.zones.slice(0, 10),
  };
}

/**
 * Get today's delivery statistics
 * @param {Date} todayStart
 * @returns {Promise<Object>}
 */
async function getTodayStats(todayStart) {
  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('id, status, shipping_fee')
    .gte('created_at', todayStart.toISOString());

  if (error) {
    throw new Error(`Failed to get today stats: ${error.message}`);
  }

  const shipments = data || [];
  const delivered = shipments.filter(s => s.status === 'delivered');
  const failed = shipments.filter(s => s.status === 'failed');
  const inProgress = shipments.filter(s => ['assigned', 'picked_up', 'delivering'].includes(s.status));

  return {
    total: shipments.length,
    delivered: delivered.length,
    failed: failed.length,
    inProgress: inProgress.length,
    revenue: delivered.reduce((sum, s) => sum + parseFloat(s.shipping_fee || 0), 0),
  };
}

module.exports = {
  getDeliveryCounts,
  getSuccessRateAndFailures,
  getZoneAnalytics,
  getDashboardAnalytics,
  getTodayStats,
};
