/**
 * Shipper Statistics Service
 * Business logic for shipper performance statistics
 * 
 * Requirements: 9.1, 9.4 (Shipper Performance Tracking)
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const shipperRepository = require('./shipper.repository');
const ratingRepository = require('./rating.repository');

// ============================================
// STATISTICS CALCULATION
// ============================================

/**
 * Calculate shipper success rate
 * Requirements: 9.1 - Record delivery time and calculate on-time rate
 * 
 * @param {string} shipperId
 * @returns {Promise<number>} Success rate as percentage (0-100)
 */
async function calculateSuccessRate(shipperId) {
  const shipper = await shipperRepository.findShipperById(shipperId);
  if (!shipper) {
    throw new Error('Shipper not found');
  }

  const totalDeliveries = shipper.total_deliveries || 0;
  const successfulDeliveries = shipper.successful_deliveries || 0;

  if (totalDeliveries === 0) {
    return 0;
  }

  return Math.round((successfulDeliveries / totalDeliveries) * 100 * 10) / 10;
}

/**
 * Calculate shipper on-time delivery rate
 * Requirements: 9.1 - Calculate on-time rate
 * 
 * @param {string} shipperId
 * @param {Date} [startDate] - Optional start date for filtering
 * @param {Date} [endDate] - Optional end date for filtering
 * @returns {Promise<number>} On-time rate as percentage (0-100)
 */
async function calculateOnTimeRate(shipperId, startDate = null, endDate = null) {
  let query = supabaseAdmin
    .from('shipments')
    .select('id, delivered_at, estimated_delivery')
    .eq('shipper_id', shipperId)
    .eq('status', 'delivered')
    .not('delivered_at', 'is', null)
    .not('estimated_delivery', 'is', null);

  if (startDate) {
    query = query.gte('delivered_at', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('delivered_at', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to calculate on-time rate: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return 0;
  }

  // Count deliveries that were on time (delivered before or at estimated time)
  const onTimeCount = data.filter(shipment => {
    const deliveredAt = new Date(shipment.delivered_at);
    const estimatedDelivery = new Date(shipment.estimated_delivery);
    return deliveredAt <= estimatedDelivery;
  }).length;

  return Math.round((onTimeCount / data.length) * 100 * 10) / 10;
}


/**
 * Get aggregated statistics for a shipper
 * Requirements: 9.4 - Display success rate, average rating, and daily statistics
 * 
 * @param {string} shipperId
 * @param {string} period - 'today' | 'week' | 'month' | 'all'
 * @returns {Promise<Object>} Aggregated statistics
 */
async function getShipperStatistics(shipperId, period = 'all') {
  const shipper = await shipperRepository.findShipperById(shipperId);
  if (!shipper) {
    throw new Error('Shipper not found');
  }

  // Calculate date range based on period
  const now = new Date();
  let startDate = null;
  let endDate = now;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all':
    default:
      startDate = null;
      endDate = null;
      break;
  }

  // Get period-specific delivery stats
  const periodStats = await getDeliveryStatsByPeriod(shipperId, startDate, endDate);
  
  // Get rating statistics
  const ratingStats = await ratingRepository.getShipperRatingStats(shipperId);
  
  // Calculate on-time rate for the period
  const onTimeRate = await calculateOnTimeRate(shipperId, startDate, endDate);
  
  // Calculate overall success rate from shipper record
  const successRate = await calculateSuccessRate(shipperId);

  return {
    shipperId,
    period,
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null,
    
    // Overall statistics (from shipper record)
    overall: {
      totalDeliveries: shipper.total_deliveries || 0,
      successfulDeliveries: shipper.successful_deliveries || 0,
      failedDeliveries: shipper.failed_deliveries || 0,
      successRate,
      avgRating: shipper.avg_rating || 0,
      totalRatings: shipper.total_ratings || 0,
    },
    
    // Period-specific statistics
    periodStats: {
      totalDeliveries: periodStats.totalDeliveries,
      successfulDeliveries: periodStats.successfulDeliveries,
      failedDeliveries: periodStats.failedDeliveries,
      successRate: periodStats.successRate,
      onTimeRate,
      totalEarnings: periodStats.totalEarnings,
      totalCodCollected: periodStats.totalCodCollected,
    },
    
    // Rating breakdown
    ratings: {
      avgRating: ratingStats.avgRating,
      totalRatings: ratingStats.totalRatings,
      distribution: ratingStats.distribution,
    },
    
    // Status info
    status: {
      isOnline: shipper.is_online || false,
      isAvailable: shipper.is_available || false,
      isFlagged: shipper.is_flagged || false,
      flaggedReason: shipper.flagged_reason,
    },
  };
}

/**
 * Get delivery statistics for a specific period
 * @param {string} shipperId
 * @param {Date|null} startDate
 * @param {Date|null} endDate
 * @returns {Promise<Object>}
 */
async function getDeliveryStatsByPeriod(shipperId, startDate, endDate) {
  let query = supabaseAdmin
    .from('shipments')
    .select('id, status, shipping_fee, cod_amount, cod_collected, delivered_at')
    .eq('shipper_id', shipperId);

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get delivery stats: ${error.message}`);
  }

  const shipments = data || [];
  
  // Calculate statistics
  const deliveredShipments = shipments.filter(s => s.status === 'delivered');
  const failedShipments = shipments.filter(s => s.status === 'failed');
  
  const totalDeliveries = deliveredShipments.length + failedShipments.length;
  const successfulDeliveries = deliveredShipments.length;
  const failedDeliveries = failedShipments.length;
  
  const successRate = totalDeliveries > 0 
    ? Math.round((successfulDeliveries / totalDeliveries) * 100 * 10) / 10 
    : 0;
  
  // Calculate earnings
  const totalEarnings = deliveredShipments.reduce((sum, s) => {
    return sum + parseFloat(s.shipping_fee || 0);
  }, 0);
  
  const totalCodCollected = deliveredShipments
    .filter(s => s.cod_collected)
    .reduce((sum, s) => sum + parseFloat(s.cod_amount || 0), 0);

  return {
    totalDeliveries,
    successfulDeliveries,
    failedDeliveries,
    successRate,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    totalCodCollected: Math.round(totalCodCollected * 100) / 100,
  };
}


/**
 * Get daily statistics for a shipper
 * Requirements: 9.4 - Display daily statistics
 * 
 * @param {string} shipperId
 * @param {number} days - Number of days to retrieve (default 7)
 * @returns {Promise<Object[]>} Array of daily statistics
 */
async function getDailyStatistics(shipperId, days = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('id, status, shipping_fee, cod_amount, cod_collected, delivered_at, created_at')
    .eq('shipper_id', shipperId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    throw new Error(`Failed to get daily stats: ${error.message}`);
  }

  // Group by date
  const dailyStats = {};
  
  // Initialize all days with zero values
  for (let i = 0; i < days; i++) {
    const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split('T')[0];
    dailyStats[dateKey] = {
      date: dateKey,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      earnings: 0,
      codCollected: 0,
    };
  }

  // Populate with actual data
  (data || []).forEach(shipment => {
    const dateKey = shipment.created_at.split('T')[0];
    if (dailyStats[dateKey]) {
      if (shipment.status === 'delivered') {
        dailyStats[dateKey].totalDeliveries++;
        dailyStats[dateKey].successfulDeliveries++;
        dailyStats[dateKey].earnings += parseFloat(shipment.shipping_fee || 0);
        if (shipment.cod_collected) {
          dailyStats[dateKey].codCollected += parseFloat(shipment.cod_amount || 0);
        }
      } else if (shipment.status === 'failed') {
        dailyStats[dateKey].totalDeliveries++;
        dailyStats[dateKey].failedDeliveries++;
      }
    }
  });

  // Convert to array and sort by date descending
  return Object.values(dailyStats)
    .map(day => ({
      ...day,
      successRate: day.totalDeliveries > 0 
        ? Math.round((day.successfulDeliveries / day.totalDeliveries) * 100 * 10) / 10 
        : 0,
      earnings: Math.round(day.earnings * 100) / 100,
      codCollected: Math.round(day.codCollected * 100) / 100,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get weekly statistics for a shipper
 * @param {string} shipperId
 * @param {number} weeks - Number of weeks to retrieve (default 4)
 * @returns {Promise<Object[]>} Array of weekly statistics
 */
async function getWeeklyStatistics(shipperId, weeks = 4) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('id, status, shipping_fee, cod_amount, cod_collected, delivered_at, created_at')
    .eq('shipper_id', shipperId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    throw new Error(`Failed to get weekly stats: ${error.message}`);
  }

  // Group by week
  const weeklyStats = {};
  
  // Initialize weeks
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(endDate.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(endDate.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekKey = `week_${i + 1}`;
    weeklyStats[weekKey] = {
      weekNumber: i + 1,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      earnings: 0,
      codCollected: 0,
    };
  }

  // Populate with actual data
  (data || []).forEach(shipment => {
    const shipmentDate = new Date(shipment.created_at);
    const daysDiff = Math.floor((endDate.getTime() - shipmentDate.getTime()) / (24 * 60 * 60 * 1000));
    const weekIndex = Math.floor(daysDiff / 7);
    const weekKey = `week_${weekIndex + 1}`;
    
    if (weeklyStats[weekKey]) {
      if (shipment.status === 'delivered') {
        weeklyStats[weekKey].totalDeliveries++;
        weeklyStats[weekKey].successfulDeliveries++;
        weeklyStats[weekKey].earnings += parseFloat(shipment.shipping_fee || 0);
        if (shipment.cod_collected) {
          weeklyStats[weekKey].codCollected += parseFloat(shipment.cod_amount || 0);
        }
      } else if (shipment.status === 'failed') {
        weeklyStats[weekKey].totalDeliveries++;
        weeklyStats[weekKey].failedDeliveries++;
      }
    }
  });

  // Convert to array and calculate success rates
  return Object.values(weeklyStats)
    .map(week => ({
      ...week,
      successRate: week.totalDeliveries > 0 
        ? Math.round((week.successfulDeliveries / week.totalDeliveries) * 100 * 10) / 10 
        : 0,
      earnings: Math.round(week.earnings * 100) / 100,
      codCollected: Math.round(week.codCollected * 100) / 100,
    }))
    .sort((a, b) => a.weekNumber - b.weekNumber);
}

/**
 * Get monthly statistics for a shipper
 * @param {string} shipperId
 * @param {number} months - Number of months to retrieve (default 6)
 * @returns {Promise<Object[]>} Array of monthly statistics
 */
async function getMonthlyStatistics(shipperId, months = 6) {
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - months + 1, 1);

  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('id, status, shipping_fee, cod_amount, cod_collected, delivered_at, created_at')
    .eq('shipper_id', shipperId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    throw new Error(`Failed to get monthly stats: ${error.message}`);
  }

  // Group by month
  const monthlyStats = {};
  
  // Initialize months
  for (let i = 0; i < months; i++) {
    const monthDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    monthlyStats[monthKey] = {
      month: monthKey,
      year: monthDate.getFullYear(),
      monthNumber: monthDate.getMonth() + 1,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      earnings: 0,
      codCollected: 0,
    };
  }

  // Populate with actual data
  (data || []).forEach(shipment => {
    const shipmentDate = new Date(shipment.created_at);
    const monthKey = `${shipmentDate.getFullYear()}-${String(shipmentDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (monthlyStats[monthKey]) {
      if (shipment.status === 'delivered') {
        monthlyStats[monthKey].totalDeliveries++;
        monthlyStats[monthKey].successfulDeliveries++;
        monthlyStats[monthKey].earnings += parseFloat(shipment.shipping_fee || 0);
        if (shipment.cod_collected) {
          monthlyStats[monthKey].codCollected += parseFloat(shipment.cod_amount || 0);
        }
      } else if (shipment.status === 'failed') {
        monthlyStats[monthKey].totalDeliveries++;
        monthlyStats[monthKey].failedDeliveries++;
      }
    }
  });

  // Convert to array and calculate success rates
  return Object.values(monthlyStats)
    .map(month => ({
      ...month,
      successRate: month.totalDeliveries > 0 
        ? Math.round((month.successfulDeliveries / month.totalDeliveries) * 100 * 10) / 10 
        : 0,
      earnings: Math.round(month.earnings * 100) / 100,
      codCollected: Math.round(month.codCollected * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

module.exports = {
  calculateSuccessRate,
  calculateOnTimeRate,
  getShipperStatistics,
  getDeliveryStatsByPeriod,
  getDailyStatistics,
  getWeeklyStatistics,
  getMonthlyStatistics,
};
