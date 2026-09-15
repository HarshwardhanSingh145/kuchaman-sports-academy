import { NextRequest, NextResponse } from 'next/server';
import { createCashfreeOrder, getCashfreeConfig } from '@/lib/cashfree';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      amount,
      customerName,
      customerPhone,
      customerEmail,
      category,
      orderNote,
    } = body;

    const payableAmount = Number(amount);
    if (!payableAmount || payableAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid order amount.' },
        { status: 400 }
      );
    }

    if (!customerPhone || !customerPhone.trim()) {
      return NextResponse.json(
        { success: false, error: 'Customer phone number is required.' },
        { status: 400 }
      );
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    // Unique order ID prefix
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = category === 'admission' ? 'KSA-ADM' : category === 'swimming' ? 'KSA-SWM' : 'KSA-CRK';
    const orderId = `${prefix}-${timestamp}-${randomSuffix}`;

    const returnUrl = `${baseUrl}/booking?cf_order_id={order_id}`;
    const notifyUrl = `${baseUrl}/api/payments/cashfree/webhook`;

    const config = getCashfreeConfig();

    if (!config) {
      // Credentials not configured yet
      return NextResponse.json({
        success: false,
        notConfigured: true,
        orderId,
        orderAmount: payableAmount,
        message:
          'Cashfree API Credentials (CASHFREE_APP_ID & CASHFREE_SECRET_KEY) are not configured in environment variables.',
        instructions:
          'Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in your environment to process live payments.',
      });
    }

    // Create real order in Cashfree
    const orderResult = await createCashfreeOrder({
      orderId,
      orderAmount: payableAmount,
      customerName: customerName || 'KSA Customer',
      customerPhone: customerPhone,
      customerEmail: customerEmail || undefined,
      returnUrl,
      notifyUrl,
      orderNote: orderNote || `Kuchaman Sports Academy - ${category || 'Booking'}`,
    });

    if (!orderResult.success || !orderResult.payment_session_id) {
      return NextResponse.json(
        {
          success: false,
          error: orderResult.error || 'Failed to initiate Cashfree order.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      order_id: orderResult.order_id || orderId,
      payment_session_id: orderResult.payment_session_id,
      environment: config.env,
      amount: payableAmount,
    });
  } catch (error: any) {
    console.error('API /payments/cashfree/create-order error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
