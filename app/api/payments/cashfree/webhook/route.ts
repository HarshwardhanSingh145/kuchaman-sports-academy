import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { updateFirestoreBookingStatus } from '@/lib/firestore-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Cashfree PG sends webhook events like PAYMENT_SUCCESS_WEBHOOK
    const eventType = body?.type;
    const data = body?.data;

    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || data?.payment?.payment_status === 'SUCCESS') {
      const orderId = data?.order?.order_id;
      const paymentId = data?.payment?.cf_payment_id;

      if (orderId) {
        // Update booking status to APPROVED / COMPLETED
        StorageService.updateBookingPaymentStatus(
          orderId,
          'APPROVED',
          'COMPLETED',
          'Automated confirmation via Cashfree webhook'
        );
        try {
          await updateFirestoreBookingStatus(orderId, 'COMPLETED', {
            paymentStatus: 'APPROVED',
            verifiedBy: 'Cashfree Webhook',
          });
        } catch (fsErr) {
          console.warn('Firestore webhook update notice:', fsErr);
        }
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error('Cashfree webhook processing error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
