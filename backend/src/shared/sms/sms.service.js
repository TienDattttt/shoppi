/**
 * SMS Service
 * Send SMS messages via Infobip
 */

const axios = require('axios');

/**
 * Check if SMS service is configured
 */
function isConfigured() {
    return !!(process.env.INFOBIP_API_KEY && process.env.INFOBIP_BASE_URL);
}

/**
 * Format phone number to E.164 format
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Vietnamese phone numbers: 0xxx -> 84xxx
    if (cleaned.startsWith('0')) {
        cleaned = '84' + cleaned.substring(1);
    }
    
    return cleaned;
}

/**
 * Send SMS message via Infobip
 * @param {string} to - Recipient phone number
 * @param {string} message - Message content
 * @returns {Promise<object>}
 */
async function sendSMS(to, message) {
    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL;
    const sender = process.env.INFOBIP_SENDER || 'Shoppi';
    
    if (!apiKey || !baseUrl) {
        console.warn('[SMS] Infobip not configured, skipping SMS');
        return { success: false, error: 'SMS service not configured' };
    }
    
    try {
        const formattedPhone = formatPhoneNumber(to);
        
        const response = await axios.post(
            `${baseUrl}/sms/2/text/advanced`,
            {
                messages: [
                    {
                        destinations: [{ to: formattedPhone }],
                        from: sender,
                        text: message
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `App ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );
        
        const result = response.data;
        const messageInfo = result.messages?.[0];
        
        console.log(`[SMS] Sent to ${formattedPhone}, MessageId: ${messageInfo?.messageId}, Status: ${messageInfo?.status?.name}`);
        
        return {
            success: true,
            messageId: messageInfo?.messageId,
            status: messageInfo?.status?.name
        };
    } catch (error) {
        const errorMsg = error.response?.data?.requestError?.serviceException?.text || error.message;
        console.error('[SMS] Failed to send:', errorMsg);
        return {
            success: false,
            error: errorMsg
        };
    }
}

/**
 * Send OTP via SMS
 * @param {string} phone - Recipient phone number
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} purpose - 'registration', 'login', or 'password_reset'
 * @returns {Promise<object>}
 */
async function sendOTP(phone, otpCode, purpose = 'verification') {
    const purposeText = {
        registration: 'xac thuc tai khoan',
        login: 'dang nhap',
        password_reset: 'dat lai mat khau'
    };
    
    // Use ASCII for better SMS delivery
    const message = `[Shoppi] Ma OTP ${purposeText[purpose] || 'xac thuc'} cua ban la: ${otpCode}. Ma co hieu luc trong 5 phut.`;
    
    return sendSMS(phone, message);
}

/**
 * Send order status update SMS
 * @param {string} phone - Recipient phone number
 * @param {string} orderCode - Order code
 * @param {string} status - Order status
 * @returns {Promise<object>}
 */
async function sendOrderStatusSMS(phone, orderCode, status) {
    const statusText = {
        confirmed: 'da duoc xac nhan',
        shipping: 'dang duoc giao',
        delivered: 'da giao thanh cong',
        cancelled: 'da bi huy'
    };
    
    const message = `[Shoppi] Don hang #${orderCode} ${statusText[status] || status}. Truy cap app de xem chi tiet.`;
    
    return sendSMS(phone, message);
}

module.exports = {
    isConfigured,
    formatPhoneNumber,
    sendSMS,
    sendOTP,
    sendOrderStatusSMS
};
