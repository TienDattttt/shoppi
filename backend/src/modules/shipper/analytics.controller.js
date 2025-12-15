/**
 * Delivery Analytics Controller
 * HTTP handlers for delivery analytics endpoints
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5 (Delivery Analytics Dashboard)
 */

const analyticsService = require('./analytics.service');
const statisticsService = require('./statistics.service');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

// ============================================
// DASHBOARD ANALYTICS
// ============================================

/**
 * GET /api/admin/analytics/dashboard
 * Get comprehensive analytics dashboard data
 * Requirements: 16.1, 16.2, 16.4
 */
async function getDashboard(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    const data = await analyticsService.getDashboardAnalytics(start, end);
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: error.message },
    });
  }
}

/**
 * GET /api/admin/analytics/deliveries
 * Get delivery counts by period
 * Requirements: 16.1
 */
async function getDeliveryCounts(req, res) {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    const data = await analyticsService.getDeliveryCounts(period, start, end);
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get delivery counts error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: error.message },
    });
  }
}

/**
 * GET /api/admin/analytics/success-rate
 * Get success rate and failure breakdown
 * Requirements: 16.2
 */
async function getSuccessRate(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    const data = await analyticsService.getSuccessRateAndFailures(start, end);
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get success rate error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: error.message },
    });
  }
}

/**
 * GET /api/admin/analytics/zones
 * Get zone-based analytics
 * Requirements: 16.4
 */
async function getZoneAnalytics(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    const data = await analyticsService.getZoneAnalytics(start, end);
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get zone analytics error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: error.message },
    });
  }
}


// ============================================
// SHIPPER RANKING
// ============================================

/**
 * GET /api/admin/analytics/shipper-ranking
 * Get shipper ranking by various metrics
 * Requirements: 16.3
 */
async function getShipperRanking(req, res) {
  try {
    const { sortBy = 'deliveries', limit = 20, startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get all active shippers with their stats
    const { data: shippers, error: shipperError } = await supabaseAdmin
      .from('shippers')
      .select(`
        id,
        user_id,
        total_deliveries,
        successful_deliveries,
        failed_deliveries,
        avg_rating,
        total_ratings,
        status
      `)
      .eq('status', 'active');

    if (shipperError) {
      throw new Error(`Failed to get shippers: ${shipperError.message}`);
    }

    // Get user info for shippers
    const userIds = (shippers || []).map(s => s.user_id).filter(Boolean);
    let usersMap = {};
    
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, full_name, phone, avatar_url')
        .in('id', userIds);
      
      usersMap = (users || []).reduce((acc, u) => {
        acc[u.id] = u;
        return acc;
      }, {});
    }

    // Get period-specific delivery stats for each shipper
    const shipperIds = (shippers || []).map(s => s.id);
    
    const { data: periodShipments, error: shipmentError } = await supabaseAdmin
      .from('shipments')
      .select('shipper_id, status, delivered_at, estimated_delivery')
      .in('shipper_id', shipperIds)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (shipmentError) {
      throw new Error(`Failed to get shipments: ${shipmentError.message}`);
    }

    // Calculate period stats per shipper
    const periodStats = {};
    (periodShipments || []).forEach(s => {
      if (!periodStats[s.shipper_id]) {
        periodStats[s.shipper_id] = {
          deliveries: 0,
          successful: 0,
          onTime: 0,
        };
      }
      
      if (s.status === 'delivered') {
        periodStats[s.shipper_id].deliveries++;
        periodStats[s.shipper_id].successful++;
        
        if (s.delivered_at && s.estimated_delivery) {
          if (new Date(s.delivered_at) <= new Date(s.estimated_delivery)) {
            periodStats[s.shipper_id].onTime++;
          }
        }
      } else if (s.status === 'failed') {
        periodStats[s.shipper_id].deliveries++;
      }
    });

    // Build ranking data
    const ranking = (shippers || []).map(shipper => {
      const user = usersMap[shipper.user_id] || {};
      const stats = periodStats[shipper.id] || { deliveries: 0, successful: 0, onTime: 0 };
      
      const successRate = stats.deliveries > 0
        ? Math.round((stats.successful / stats.deliveries) * 100 * 10) / 10
        : 0;
      
      const onTimeRate = stats.successful > 0
        ? Math.round((stats.onTime / stats.successful) * 100 * 10) / 10
        : 0;

      return {
        shipperId: shipper.id,
        name: user.full_name || 'Unknown',
        phone: user.phone,
        avatarUrl: user.avatar_url,
        totalDeliveries: shipper.total_deliveries || 0,
        periodDeliveries: stats.deliveries,
        successRate,
        onTimeRate,
        rating: shipper.avg_rating || 0,
        totalRatings: shipper.total_ratings || 0,
      };
    });

    // Sort by specified metric
    const sortedRanking = ranking.sort((a, b) => {
      switch (sortBy) {
        case 'deliveries':
          return b.periodDeliveries - a.periodDeliveries;
        case 'rating':
          return b.rating - a.rating;
        case 'ontime':
          return b.onTimeRate - a.onTimeRate;
        case 'success':
          return b.successRate - a.successRate;
        default:
          return b.periodDeliveries - a.periodDeliveries;
      }
    });

    // Add rank numbers
    const rankedData = sortedRanking.slice(0, parseInt(limit)).map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    res.json({
      success: true,
      data: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        sortBy,
        total: ranking.length,
        ranking: rankedData,
      },
    });
  } catch (error) {
    console.error('Get shipper ranking error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: error.message },
    });
  }
}


// ============================================
// EXPORT FUNCTIONALITY
// ============================================

/**
 * GET /api/admin/analytics/export
 * Export delivery statistics as CSV
 * Requirements: 16.5
 */
async function exportAnalytics(req, res) {
  try {
    const { format = 'csv', startDate, endDate, type = 'deliveries' } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    let data;
    let filename;
    let headers;
    
    switch (type) {
      case 'deliveries':
        data = await getDeliveryExportData(start, end);
        filename = `deliveries_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
        headers = ['Tracking Number', 'Status', 'Shipper', 'Pickup Address', 'Delivery Address', 
                   'Shipping Fee', 'COD Amount', 'Created At', 'Delivered At', 'Failure Reason'];
        break;
      
      case 'shippers':
        data = await getShipperExportData(start, end);
        filename = `shippers_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
        headers = ['Shipper Name', 'Phone', 'Total Deliveries', 'Successful', 'Failed', 
                   'Success Rate', 'On-Time Rate', 'Rating', 'Total Ratings'];
        break;
      
      case 'zones':
        data = await getZoneExportData(start, end);
        filename = `zones_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
        headers = ['Zone', 'Total Deliveries', 'Delivered', 'Failed', 'Success Rate', 
                   'Revenue', 'Avg Delivery Time (hours)'];
        break;
      
      default:
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_TYPE', message: 'Invalid export type' },
        });
    }

    if (format === 'csv') {
      const csv = generateCSV(headers, data);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send('\uFEFF' + csv); // BOM for Excel UTF-8 support
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        period: { startDate: start.toISOString(), endDate: end.toISOString() },
        type,
        data,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FORMAT', message: 'Invalid export format. Use csv or json.' },
      });
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'EXPORT_ERROR', message: error.message },
    });
  }
}

/**
 * Get delivery data for export
 */
async function getDeliveryExportData(startDate, endDate) {
  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select(`
      tracking_number,
      status,
      shipper_id,
      pickup_address,
      delivery_address,
      shipping_fee,
      cod_amount,
      created_at,
      delivered_at,
      failure_reason
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get delivery data: ${error.message}`);
  }

  // Get shipper names
  const shipperIds = [...new Set((data || []).map(d => d.shipper_id).filter(Boolean))];
  let shipperMap = {};
  
  if (shipperIds.length > 0) {
    const { data: shippers } = await supabaseAdmin
      .from('shippers')
      .select('id, user_id')
      .in('id', shipperIds);
    
    const userIds = (shippers || []).map(s => s.user_id).filter(Boolean);
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, full_name')
        .in('id', userIds);
      
      const userMap = (users || []).reduce((acc, u) => { acc[u.id] = u.full_name; return acc; }, {});
      shipperMap = (shippers || []).reduce((acc, s) => { acc[s.id] = userMap[s.user_id] || 'Unknown'; return acc; }, {});
    }
  }

  return (data || []).map(d => [
    d.tracking_number,
    d.status,
    shipperMap[d.shipper_id] || 'Unassigned',
    d.pickup_address,
    d.delivery_address,
    d.shipping_fee || 0,
    d.cod_amount || 0,
    d.created_at,
    d.delivered_at || '',
    d.failure_reason || '',
  ]);
}

/**
 * Get shipper data for export
 */
async function getShipperExportData(startDate, endDate) {
  const { data: shippers, error } = await supabaseAdmin
    .from('shippers')
    .select('id, user_id, total_deliveries, successful_deliveries, failed_deliveries, avg_rating, total_ratings')
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to get shipper data: ${error.message}`);
  }

  // Get user info
  const userIds = (shippers || []).map(s => s.user_id).filter(Boolean);
  let userMap = {};
  
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone')
      .in('id', userIds);
    
    userMap = (users || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
  }

  // Get period stats
  const shipperIds = (shippers || []).map(s => s.id);
  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select('shipper_id, status, delivered_at, estimated_delivery')
    .in('shipper_id', shipperIds)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const periodStats = {};
  (shipments || []).forEach(s => {
    if (!periodStats[s.shipper_id]) {
      periodStats[s.shipper_id] = { total: 0, successful: 0, onTime: 0 };
    }
    if (s.status === 'delivered') {
      periodStats[s.shipper_id].total++;
      periodStats[s.shipper_id].successful++;
      if (s.delivered_at && s.estimated_delivery && new Date(s.delivered_at) <= new Date(s.estimated_delivery)) {
        periodStats[s.shipper_id].onTime++;
      }
    } else if (s.status === 'failed') {
      periodStats[s.shipper_id].total++;
    }
  });

  return (shippers || []).map(s => {
    const user = userMap[s.user_id] || {};
    const stats = periodStats[s.id] || { total: 0, successful: 0, onTime: 0 };
    const successRate = stats.total > 0 ? Math.round((stats.successful / stats.total) * 100 * 10) / 10 : 0;
    const onTimeRate = stats.successful > 0 ? Math.round((stats.onTime / stats.successful) * 100 * 10) / 10 : 0;
    
    return [
      user.full_name || 'Unknown',
      user.phone || '',
      stats.total,
      stats.successful,
      stats.total - stats.successful,
      successRate,
      onTimeRate,
      s.avg_rating || 0,
      s.total_ratings || 0,
    ];
  });
}

/**
 * Get zone data for export
 */
async function getZoneExportData(startDate, endDate) {
  const zoneData = await analyticsService.getZoneAnalytics(startDate, endDate);
  
  return zoneData.zones.map(z => [
    z.zone,
    z.total,
    z.delivered,
    z.failed,
    z.successRate,
    z.revenue,
    z.avgDeliveryTimeHours,
  ]);
}

/**
 * Generate CSV string from headers and data
 */
function generateCSV(headers, data) {
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = data.map(row => row.map(escapeCSV).join(','));
  
  return [headerRow, ...dataRows].join('\n');
}

module.exports = {
  getDashboard,
  getDeliveryCounts,
  getSuccessRate,
  getZoneAnalytics,
  getShipperRanking,
  exportAnalytics,
};
