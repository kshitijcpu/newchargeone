// ChargeOne — payment provider integration (Razorpay).
// When RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set, real sandbox API calls
// are made (orders, refunds). Without keys the same interface runs in
// deterministic simulated mode so the product works everywhere.
// Webhook signatures are ALWAYS verified with HMAC-SHA256 (Razorpay scheme).
import crypto from 'crypto';

const KEY = process.env.RAZORPAY_KEY_ID || '';
const SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'chargeone-demo-webhook-secret';
const LIVE = !!(KEY && SECRET);

const b64auth = () => 'Basic ' + Buffer.from(`${KEY}:${SECRET}`).toString('base64');

export const providerInfo = () => ({
  name: 'Razorpay', mode: LIVE ? (KEY.startsWith('rzp_live') ? 'LIVE' : 'SANDBOX') : 'SIMULATED',
  configured: LIVE, webhookScheme: 'HMAC-SHA256 (X-Razorpay-Signature)',
  webhookEndpoint: '/api/webhooks/razorpay',
  capabilities: ['orders', 'auth-capture', 'refunds', 'webhooks', 'idempotency'],
});

/** Create a provider order for authorization. */
export async function createOrder(amountInr, receipt) {
  if (LIVE) {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: b64auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amountInr * 100), currency: 'INR', receipt, payment_capture: 0 }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error?.description || 'Provider order failed');
    return { orderId: d.id, mode: 'SANDBOX' };
  }
  return { orderId: 'order_sim_' + crypto.randomBytes(7).toString('hex'), mode: 'SIMULATED' };
}

/** Capture the final amount after energy delivery. */
export async function capture(providerPaymentId, amountInr) {
  if (LIVE && providerPaymentId?.startsWith('pay_')) {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${providerPaymentId}/capture`, {
      method: 'POST', headers: { Authorization: b64auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amountInr * 100), currency: 'INR' }),
    });
    return res.json();
  }
  return { id: providerPaymentId, status: 'captured', simulated: true };
}

/** Issue a refund / release with the provider. */
export async function providerRefund(providerPaymentId, amountInr, notes = {}) {
  if (LIVE && providerPaymentId?.startsWith('pay_')) {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${providerPaymentId}/refund`, {
      method: 'POST', headers: { Authorization: b64auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amountInr * 100), notes }),
    });
    const d = await res.json();
    return { refundId: d.id || null, status: d.status || 'failed', raw: d };
  }
  return { refundId: 'rfnd_sim_' + crypto.randomBytes(6).toString('hex'), status: 'processed', simulated: true };
}

/** Verify a Razorpay webhook signature (constant-time compare). */
export function verifyWebhookSignature(rawBody, signature) {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch { return false; }
}

/** Verify a checkout callback signature (order_id|payment_id scheme). */
export function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!LIVE) return true; // simulated mode
  const expected = crypto.createHmac('sha256', SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || '')); } catch { return false; }
}
