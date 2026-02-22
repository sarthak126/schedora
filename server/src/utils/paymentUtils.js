const crypto = require('crypto');
const Razorpay = require('razorpay');

// =================== CONFIGURATION ===================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-in-production';
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

// =================== ENCRYPTION HELPERS ===================

/**
 * Encrypt sensitive data (for storing salon's Razorpay secret)
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted string (iv:ciphertext format)
 */
const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted string (iv:ciphertext format)
 * @returns {string|null} Decrypted plain text or null on error
 */
const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        const [ivHex, encrypted] = encryptedText.split(':');
        if (!ivHex || !encrypted) return null;
        const iv = Buffer.from(ivHex, 'hex');
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption error:', err.message);
        return null;
    }
};

// =================== SALON RAZORPAY HELPERS ===================

/**
 * Get Razorpay instance for a salon based on payment mode
 * 
 * Payment Modes:
 * - 'direct': Salon uses their own Razorpay account, money goes directly to salon
 * - 'platform': Platform collects payment, transfers to salon via Route API (future)
 * 
 * @param {Object} salon - Salon document with credentials
 * @param {Object} platformRazorpay - Platform's Razorpay instance (optional)
 * @returns {Object} { razorpay, key_id, mode, secret }
 */
const getSalonRazorpay = (salon, platformRazorpay = null) => {
    // Platform mode - use platform's Razorpay (for future Route API)
    if (salon.paymentMode === 'platform') {
        if (!platformRazorpay && !process.env.RAZORPAY_KEY_ID) {
            throw new Error('Platform Razorpay not configured');
        }

        return {
            razorpay: platformRazorpay || new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
            }),
            key_id: process.env.RAZORPAY_KEY_ID,
            mode: 'platform',
            secret: process.env.RAZORPAY_KEY_SECRET
        };
    }

    // Direct mode - use salon's own Razorpay
    if (!salon.razorpay?.isConfigured) {
        throw new Error('PAYMENT_NOT_CONFIGURED');
    }

    if (!salon.razorpay?.key_id || !salon.razorpay?.key_secret_encrypted) {
        throw new Error('PAYMENT_CREDENTIALS_MISSING');
    }

    const decryptedSecret = decrypt(salon.razorpay.key_secret_encrypted);
    if (!decryptedSecret) {
        throw new Error('PAYMENT_DECRYPTION_FAILED');
    }

    return {
        razorpay: new Razorpay({
            key_id: salon.razorpay.key_id,
            key_secret: decryptedSecret
        }),
        key_id: salon.razorpay.key_id,
        mode: 'direct',
        secret: decryptedSecret
    };
};

/**
 * Verify Razorpay payment signature for salon payments
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Signature from Razorpay
 * @param {string} secret - Razorpay key secret (salon's or platform's)
 * @returns {boolean} Whether signature is valid
 */
const verifySalonSignature = (orderId, paymentId, signature, secret) => {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

    return expectedSignature === signature;
};

module.exports = {
    encrypt,
    decrypt,
    getSalonRazorpay,
    verifySalonSignature
};
