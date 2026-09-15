/**
 * Cashfree Payment Gateway Integration Helper
 * Provides server-side helper methods for creating Cashfree PG orders,
 * fetching order status, and verifying payment transactions.
 */

export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  env: 'sandbox' | 'production';
  apiVersion: string;
}

export function getCashfreeConfig(): CashfreeConfig | null {
  const appId = process.env.CASHFREE_APP_ID?.trim();
  const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
  const env = (process.env.CASHFREE_ENV?.toLowerCase() === 'production'
    ? 'production'
    : 'sandbox') as 'sandbox' | 'production';

  if (!appId || !secretKey) {
    return null;
  }

  return {
    appId,
    secretKey,
    env,
    apiVersion: '2023-08-01',
  };
}

export function getCashfreeBaseUrl(env: 'sandbox' | 'production'): string {
  return env === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

export interface CreateOrderParams {
  orderId: string;
  orderAmount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl: string;
  notifyUrl?: string;
  orderNote?: string;
}

export interface CashfreeOrderResponse {
  cf_order_id?: string | number;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'TERMINATED' | string;
  payment_session_id?: string;
  order_expiry_time?: string;
  message?: string;
  code?: string;
  type?: string;
}

/**
 * Creates a Payment Gateway Order in Cashfree
 */
export async function createCashfreeOrder(params: CreateOrderParams): Promise<{
  success: boolean;
  order?: CashfreeOrderResponse;
  payment_session_id?: string;
  order_id?: string;
  error?: string;
  isSimulated?: boolean;
}> {
  const config = getCashfreeConfig();

  // If credentials are not configured yet, return clear notice
  if (!config) {
    return {
      success: false,
      error:
        'Cashfree credentials (CASHFREE_APP_ID & CASHFREE_SECRET_KEY) are not configured in environment variables.',
      isSimulated: false,
    };
  }

  const baseUrl = getCashfreeBaseUrl(config.env);

  // Normalize phone to clean 10-digit format
  let cleanPhone = params.customerPhone.replace(/\D/g, '');
  if (cleanPhone.length > 10) {
    cleanPhone = cleanPhone.slice(-10);
  }
  if (cleanPhone.length < 10) {
    cleanPhone = '9829012345';
  }

  // Clean customer name
  const cleanName = params.customerName.trim() || 'KSA Customer';
  const cleanEmail = params.customerEmail?.trim() || `${cleanPhone}@kuchamansports.com`;
  const cleanCustomerId = `cust_${cleanPhone}_${Date.now().toString().slice(-4)}`;

  const payload = {
    order_id: params.orderId,
    order_amount: Number(params.orderAmount.toFixed(2)),
    order_currency: 'INR',
    customer_details: {
      customer_id: cleanCustomerId,
      customer_name: cleanName,
      customer_phone: cleanPhone,
      customer_email: cleanEmail,
    },
    order_meta: {
      return_url: params.returnUrl,
      notify_url: params.notifyUrl || undefined,
      payment_methods: 'cc,dc,upi,nb,app',
    },
    order_note: params.orderNote || 'Kuchaman Sports Academy Booking',
  };

  try {
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
        'x-api-version': config.apiVersion,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cashfree Create Order Error response:', data);
      return {
        success: false,
        error: data.message || `Cashfree API returned HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      order: data,
      payment_session_id: data.payment_session_id,
      order_id: data.order_id,
    };
  } catch (err: any) {
    console.error('Cashfree Create Order Network Exception:', err);
    return {
      success: false,
      error: err.message || 'Failed to connect to Cashfree Payment Gateway.',
    };
  }
}

/**
 * Fetches order details and verifies payment status with Cashfree
 */
export async function verifyCashfreeOrder(orderId: string): Promise<{
  success: boolean;
  isPaid: boolean;
  orderStatus?: string;
  order?: CashfreeOrderResponse;
  paymentDetails?: any;
  error?: string;
}> {
  const config = getCashfreeConfig();

  if (!config) {
    return {
      success: false,
      isPaid: false,
      error: 'Cashfree credentials not configured.',
    };
  }

  const baseUrl = getCashfreeBaseUrl(config.env);

  try {
    // 1. Fetch Order status
    const orderRes = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
        'x-api-version': config.apiVersion,
      },
    });

    const orderData: CashfreeOrderResponse = await orderRes.json();

    if (!orderRes.ok) {
      return {
        success: false,
        isPaid: false,
        error: orderData.message || `Failed to fetch Cashfree order (${orderRes.status})`,
      };
    }

    const isPaid = orderData.order_status === 'PAID';

    // 2. Fetch Payments array for additional payment metadata
    let paymentDetails: any = null;
    try {
      const paymentsRes = await fetch(
        `${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
        {
          method: 'GET',
          headers: {
            'x-client-id': config.appId,
            'x-client-secret': config.secretKey,
            'x-api-version': config.apiVersion,
          },
        }
      );
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        if (Array.isArray(paymentsData) && paymentsData.length > 0) {
          // Look for successful payment
          const successfulPayment = paymentsData.find(
            (p: any) => p.payment_status === 'SUCCESS'
          );
          paymentDetails = successfulPayment || paymentsData[0];
        }
      }
    } catch (paymentErr) {
      console.warn('Notice fetching payment details from Cashfree:', paymentErr);
    }

    return {
      success: true,
      isPaid,
      orderStatus: orderData.order_status,
      order: orderData,
      paymentDetails,
    };
  } catch (err: any) {
    console.error('Cashfree Verification Exception:', err);
    return {
      success: false,
      isPaid: false,
      error: err.message || 'Error verifying payment with Cashfree.',
    };
  }
}
