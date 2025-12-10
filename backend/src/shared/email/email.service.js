/**
 * Email Service using SendGrid
 * Handles all email sending operations
 */

const sgMail = require('@sendgrid/mail');

let initialized = false;

/**
 * Initialize SendGrid with API key
 */
function initSendGrid() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey && apiKey !== 'your_sendgrid_api_key_here' && !initialized) {
        sgMail.setApiKey(apiKey);
        initialized = true;
        console.log('[Email] SendGrid initialized successfully');
    }
}

/**
 * Check if email service is configured
 */
function isConfigured() {
    const apiKey = process.env.SENDGRID_API_KEY;
    return apiKey && apiKey !== 'your_sendgrid_api_key_here' && apiKey.startsWith('SG.');
}

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content (optional)
 */
async function sendEmail({ to, subject, text, html }) {
    // Initialize on first use
    initSendGrid();
    
    if (!isConfigured()) {
        console.log('[Email] SendGrid not configured. API Key:', process.env.SENDGRID_API_KEY ? 'Set but invalid' : 'Not set');
        console.log('[Email] Email would be sent to:', to);
        console.log('[Email] Subject:', subject);
        console.log('[Email] Content:', text);
        return { success: true, mock: true };
    }
    
    const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@shoppi.com';
    const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Shoppi';

    try {
        const msg = {
            to,
            from: {
                email: FROM_EMAIL,
                name: FROM_NAME,
            },
            subject,
            text,
            html: html || text,
        };

        await sgMail.send(msg);
        console.log('[Email] Sent successfully to:', to);
        return { success: true };
    } catch (error) {
        console.error('[Email] Failed to send:', error.message);
        throw error;
    }
}

/**
 * Send OTP verification email
 */
async function sendOTPEmail(to, otpCode, purpose = 'verification') {
    const purposeText = {
        registration: 'xác thực tài khoản',
        login: 'đăng nhập',
        password_reset: 'đặt lại mật khẩu',
    };

    const subject = `[Shoppi] Mã xác thực của bạn: ${otpCode}`;
    const text = `Mã xác thực ${purposeText[purpose] || 'của bạn'} là: ${otpCode}\n\nMã này có hiệu lực trong 5 phút.\n\nNếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">Shoppi</h2>
            <p>Mã xác thực ${purposeText[purpose] || 'của bạn'} là:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${otpCode}</span>
            </div>
            <p style="color: #6b7280;">Mã này có hiệu lực trong 5 phút.</p>
            <p style="color: #6b7280; font-size: 12px;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
        </div>
    `;

    return sendEmail({ to, subject, text, html });
}

/**
 * Send account approval notification
 */
async function sendAccountApprovedEmail(to, fullName) {
    const subject = '[Shoppi] Tài khoản của bạn đã được phê duyệt!';
    const text = `Xin chào ${fullName},\n\nTài khoản Partner của bạn trên Shoppi đã được phê duyệt. Bạn có thể đăng nhập và bắt đầu bán hàng ngay bây giờ.\n\nĐăng nhập tại: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login\n\nChúc bạn kinh doanh thành công!\nĐội ngũ Shoppi`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">Shoppi</h2>
            <h3 style="color: #16a34a;">🎉 Chúc mừng!</h3>
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Tài khoản Partner của bạn trên Shoppi đã được <strong style="color: #16a34a;">phê duyệt</strong>.</p>
            <p>Bạn có thể đăng nhập và bắt đầu bán hàng ngay bây giờ.</p>
            <div style="margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                   style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Đăng nhập ngay
                </a>
            </div>
            <p style="color: #6b7280;">Chúc bạn kinh doanh thành công!</p>
            <p style="color: #6b7280;">Đội ngũ Shoppi</p>
        </div>
    `;

    return sendEmail({ to, subject, text, html });
}

/**
 * Send account rejection notification
 */
async function sendAccountRejectedEmail(to, fullName, reason) {
    const subject = '[Shoppi] Thông báo về đăng ký tài khoản';
    const text = `Xin chào ${fullName},\n\nRất tiếc, đăng ký tài khoản Partner của bạn trên Shoppi chưa được phê duyệt.\n\nLý do: ${reason || 'Không đáp ứng yêu cầu'}\n\nBạn có thể đăng ký lại với thông tin chính xác hơn hoặc liên hệ hỗ trợ nếu cần.\n\nĐội ngũ Shoppi`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">Shoppi</h2>
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Rất tiếc, đăng ký tài khoản Partner của bạn trên Shoppi <strong style="color: #dc2626;">chưa được phê duyệt</strong>.</p>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <strong>Lý do:</strong> ${reason || 'Không đáp ứng yêu cầu'}
            </div>
            <p>Bạn có thể đăng ký lại với thông tin chính xác hơn hoặc liên hệ hỗ trợ nếu cần.</p>
            <p style="color: #6b7280;">Đội ngũ Shoppi</p>
        </div>
    `;

    return sendEmail({ to, subject, text, html });
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(to, otpCode) {
    return sendOTPEmail(to, otpCode, 'password_reset');
}

/**
 * Send welcome email for new partner
 */
async function sendPartnerWelcomeEmail(to, fullName, businessName) {
    const subject = '[Shoppi] Đăng ký Partner thành công - Chờ phê duyệt';
    const text = `Xin chào ${fullName},\n\nCảm ơn bạn đã đăng ký làm Partner trên Shoppi với cửa hàng "${businessName}".\n\nĐơn đăng ký của bạn đang được xem xét. Chúng tôi sẽ thông báo qua email khi tài khoản được phê duyệt.\n\nThời gian xử lý: 1-3 ngày làm việc.\n\nĐội ngũ Shoppi`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">Shoppi</h2>
            <h3>Đăng ký Partner thành công!</h3>
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Cảm ơn bạn đã đăng ký làm Partner trên Shoppi với cửa hàng <strong>"${businessName}"</strong>.</p>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <strong>⏳ Đang chờ phê duyệt</strong><br>
                Đơn đăng ký của bạn đang được xem xét. Chúng tôi sẽ thông báo qua email khi tài khoản được phê duyệt.
            </div>
            <p style="color: #6b7280;">Thời gian xử lý: 1-3 ngày làm việc.</p>
            <p style="color: #6b7280;">Đội ngũ Shoppi</p>
        </div>
    `;

    return sendEmail({ to, subject, text, html });
}

module.exports = {
    isConfigured,
    sendEmail,
    sendOTPEmail,
    sendAccountApprovedEmail,
    sendAccountRejectedEmail,
    sendPasswordResetEmail,
    sendPartnerWelcomeEmail,
};
