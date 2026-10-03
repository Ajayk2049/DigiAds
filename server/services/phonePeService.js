const crypto = require('crypto');
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const { TIMEOUTS } = require('../config/constants');

class PhonePeService {
  constructor() {
    this.tokenCache = {
      token: null,
      expiresAt: 0
    };
  }

  /**
   * Securely retrieve and cache the OAuth 2.0 access token
   * @returns {Promise<string>}
   */
  async getAuthToken() {
    const now = Math.floor(Date.now() / 1000);

    // Return cached token if still valid (with 60s buffer)
    if (this.tokenCache.token && this.tokenCache.expiresAt - 60 > now) {
      return this.tokenCache.token;
    }

    try {
      const form = new URLSearchParams({
        client_id: config.phonePe.clientId,
        client_version: process.env.PHONEPE_CLIENT_VERSION || '1',
        client_secret: config.phonePe.clientSecret,
        grant_type: 'client_credentials'
      });

      const response = await axios.post(
        `${config.phonePe.authUrl}/v1/oauth/token`,
        form,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      const { access_token, expires_at, expires_in } = response.data;
      if (!access_token) {
        throw new Error('OAuth response did not contain access_token');
      }

      // Calculate expiry (use expires_at if available, otherwise use expires_in)
      const expiresAt = expires_at || (now + (expires_in || 50 * 60));

      this.tokenCache = {
        token: access_token,
        expiresAt
      };

      logger.info({ expires: new Date(expiresAt * 1000).toISOString() }, '[PhonePe] Auth token obtained');
      return access_token;

    } catch (error) {
      logger.error({ err: error.response?.data || error.message }, 'PhonePe OAuth Token Fetch Error');
      throw new Error('Failed to authenticate with PhonePe payment service');
    }
  }

  /**
   * Extract payment URL from various PhonePe response formats
   * @param {Object} response PhonePe API response data
   * @returns {string|null}
   */
  extractPaymentUrl(response) {
    if (!response) return null;

    const candidates = [
      response?.payload?.payPageUrl,
      response?.payload?.redirectUrl,
      response?.payPageUrl,
      response?.redirectUrl,
      response?.data?.instrumentResponse?.redirectInfo?.url
    ];

    return candidates.find(Boolean) || null;
  }

  /**
   * Initiate a PhonePe payment using PG Checkout V2
   * @param {Object} params
   * @param {string} params.transactionId Unique merchant transaction/order ID
   * @param {string} params.userId Merchant user ID
   * @param {number} params.amount Amount in paise (1 INR = 100 paise)
   * @param {string} params.redirectUrl URL to return to after payment finishes
   * @param {string} params.phone Optional customer mobile number
   * @returns {Promise<{paymentUrl: string, transactionId: string}>}
   */
  async initiatePayment({ transactionId, userId, amount, redirectUrl, phone }) {
    const endpoint = '/checkout/v2/pay';
    const token = await this.getAuthToken();

    const payload = {
      merchantOrderId: transactionId,
      amount: amount,
      paymentFlow: {
        type: 'PG_CHECKOUT',
        merchantUrls: {
          redirectUrl: redirectUrl
        }
      }
    };

    // Attach optional metadata
    if (userId) {
      payload.userId = userId;
    }

    try {
      logger.info({
        url: `${config.phonePe.hostUrl}${endpoint}`,
        merchantOrderId: transactionId,
        amount
      }, '[PhonePe] Initiating payment');

      const callbackUrl = config.phonePe.callbackUrl;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${token}`
      };

      if (callbackUrl) {
        headers['X-CALLBACK-URL'] = callbackUrl;
        logger.info({ callbackUrl }, '[PhonePe] Using callback URL');
      }

      const response = await axios.post(
        `${config.phonePe.hostUrl}${endpoint}`,
        payload,
        {
          headers,
          timeout: TIMEOUTS.HTTP_REQUEST_TIMEOUT_MS
        }
      );

      logger.debug({ status: response.status, data: response.data }, '[PhonePe] Payment initiation response received');

      // Extract payment URL from response (handles multiple response formats)
      const paymentUrl = this.extractPaymentUrl(response.data);

      if (!paymentUrl) {
        logger.error({ data: response.data }, '[PhonePe] Response missing payment URL');
        throw new Error('Failed to retrieve checkout redirect URL from PhonePe response');
      }

      return {
        paymentUrl,
        transactionId: transactionId
      };

    } catch (error) {
      logger.error({ err: error.response?.data || error.message }, 'PhonePe V2 Payment Initiation Error');
      throw new Error(error.response?.data?.message || 'PhonePe payment integration error');
    }
  }

  /**
   * Fetch current status of a payment order from PhonePe Checkout V2 status API
   * @param {string} merchantOrderId The merchantOrderId used during payment initiation
   * @returns {Promise<{status: string, code: string, amount: number, raw: Object}>}
   */
  async checkTransactionStatus(merchantOrderId) {
    const endpoint = `/checkout/v2/order/${merchantOrderId}/status?details=false`;
    const token = await this.getAuthToken();

    try {
      const response = await axios.get(
        `${config.phonePe.hostUrl}${endpoint}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${token}`
          },
          timeout: 10000
        }
      );

      const payload = response.data?.payload || response.data;
      const state = payload?.state;  // COMPLETED, FAILED, PENDING
      const status = payload?.status; // PAID, etc.

      // Determine payment state for backward compatibility
      let mappedStatus;
      if (state === 'COMPLETED') {
        mappedStatus = 'COMPLETED';
      } else if (state === 'FAILED' || status === 'FAILED') {
        mappedStatus = 'FAILED';
      } else {
        mappedStatus = 'PENDING';
      }

      return {
        status: mappedStatus,
        code: state === 'COMPLETED' ? 'PAYMENT_SUCCESS' : (state === 'FAILED' ? 'PAYMENT_ERROR' : 'PAYMENT_PENDING'),
        amount: payload?.amount,
        raw: response.data
      };

    } catch (error) {
      logger.error({ err: error.response?.data || error.message }, 'PhonePe V2 Status Check Error');
      if (error.response?.status === 400 || error.response?.status === 404) {
        return {
          status: 'FAILED',
          code: 'TRANSACTION_NOT_FOUND',
          amount: 0,
          raw: error.response.data
        };
      }
      throw new Error('PhonePe status service unavailable');
    }
  }

  /**
   * Initiate a Refund request using V2 Refund API
   * Note: Refunds still use the mercury-uat enterprise endpoint
   * @param {Object} params
   * @param {string} params.refundTransactionId New transaction ID for the refund
   * @param {string} params.originalTransactionId Original payment transaction ID
   * @param {number} params.amount Amount in paise to refund (cannot exceed original amount)
   * @param {string} params.orderId Merchant order ID
   * @returns {Promise<{status: string, code: string}>}
   */
  async initiateRefund({ refundTransactionId, originalTransactionId, amount, orderId }) {
    const endpoint = '/v2/refund';
    const token = await this.getAuthToken();

    // Refunds use the mercury-uat enterprise URL, not the PG sandbox URL
    const refundBaseUrl = process.env.PHONEPE_REFUND_URL || 'https://mercury-uat.phonepe.com/enterprise-sandbox';

    const payload = {
      merchantId: config.phonePe.merchantId,
      transactionId: refundTransactionId,
      originalTransactionId: originalTransactionId,
      amount: amount,
      merchantOrderId: orderId,
      message: 'Merchant initiated cancellation refund'
    };

    try {
      const response = await axios.post(
        `${refundBaseUrl}${endpoint}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${token}`
          },
          timeout: TIMEOUTS.HTTP_REQUEST_TIMEOUT_MS
        }
      );

      if (response.data.success) {
        return {
          status: response.data.data.paymentState || 'PENDING',
          code: response.data.code || 'PAYMENT_PENDING'
        };
      } else {
        throw new Error(response.data.message || 'Refund initiation failed');
      }
    } catch (error) {
      logger.error({ err: error.response?.data || error.message }, 'PhonePe V2 Refund Initiation Error');
      throw new Error(error.response?.data?.message || 'PhonePe refund error');
    }
  }

  /**
   * Verify Webhook payload using V2 SHA256 hashed credentials
   * @param {string} authHeader Request Authorization header value
   * @returns {boolean} True if authentic
   */
  verifyWebhook(authHeader) {
    if (!config.phonePe.webhookStrict) {
      logger.info('[PhonePe Webhook] Strict verification disabled. Bypassing check.');
      return true;
    }

    if (!authHeader || !authHeader.startsWith('SHA256(') || !authHeader.endsWith(')')) {
      logger.error('[PhonePe Webhook] Invalid Authorization header format. Expected SHA256(...)');
      return false;
    }

    try {
      const receivedSignature = authHeader.trim();
      const username = config.phonePe.webhookUser;
      const password = config.phonePe.webhookPassword;
      
      const expectedHash = crypto.createHash('sha256')
        .update(`${username}:${password}`)
        .digest('hex');
      const expectedSignature = `SHA256(${expectedHash})`;

      if (receivedSignature !== expectedSignature) {
        logger.error({ receivedSignature, expectedSignature }, '[PhonePe Webhook] Signature mismatch');
        return false;
      }

      return true;
    } catch (err) {
      logger.error({ err: err.message }, 'Webhook V2 Authentication Parse Error');
      return false;
    }
  }
}

module.exports = new PhonePeService();
