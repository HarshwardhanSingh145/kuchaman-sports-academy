import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { isValidVerificationToken, notifyClientOfBookingDecision } from '@/lib/notifications';
import {
  updateFirestoreBookingStatus,
  createFirestoreBooking,
  getFirestoreBookings,
} from '@/lib/firestore-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');
    const token = searchParams.get('token');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 });
    }

    // Verify token security
    if (!token || !isValidVerificationToken(id, token)) {
      return NextResponse.json(
        { success: false, error: 'अमान्य या पुराना वेरिफिकेशन टोकन (Invalid or expired token)' },
        { status: 403 }
      );
    }

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = host ? `${proto}://${host}` : undefined;

    const bookings = StorageService.getBookings();
    let booking = bookings.find((b) => b.id.toLowerCase() === id.toLowerCase());

    // Fallback: Check Firestore if not currently in memory
    if (!booking) {
      try {
        const fsBookings = await getFirestoreBookings();
        booking = fsBookings.find((b) => b.id.toLowerCase() === id.toLowerCase());
        if (booking) {
          StorageService.mergeBookings([booking]);
        }
      } catch (fsErr) {
        console.warn('[Firestore] Booking lookup notice:', fsErr);
      }
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, error: `बुकिंग ID '${id}' नहीं मिली (Booking not found)` },
        { status: 404 }
      );
    }

    // If no action is specified, return booking details for view
    if (!action) {
      return NextResponse.json({ success: true, booking });
    }

    const normalizedAction = action.toLowerCase();
    let updatedBooking = null;
    let clientNotifyResult = null;

    if (normalizedAction === 'approve' || normalizedAction === 'yes') {
      const isAlreadyApproved = booking.paymentStatus === 'APPROVED' && booking.status === 'CONFIRMED';
      
      updatedBooking = StorageService.updateBookingPaymentStatus(
        booking.id,
        'APPROVED',
        'CONFIRMED',
        'WhatsApp 1-Click Approval by Owner (8142731917)'
      );

      if (updatedBooking) {
        await createFirestoreBooking(updatedBooking).catch((e) =>
          console.warn('[Firestore] Verify sync createFirestoreBooking notice:', e)
        );
        await updateFirestoreBookingStatus(booking.id, 'CONFIRMED', {
          paymentStatus: 'APPROVED',
          verifiedBy: 'WhatsApp 1-Click Owner (8142731917)',
          verifiedAt: new Date().toISOString(),
        }).catch((e) => console.warn('[Firestore] Verify sync notice:', e));

        // Automatically trigger confirmation message to client's WhatsApp (skip if already approved)
        if (!isAlreadyApproved) {
          clientNotifyResult = await notifyClientOfBookingDecision(
            {
              id: updatedBooking.id,
              userName: updatedBooking.userName,
              userPhone: updatedBooking.userPhone,
              userEmail: updatedBooking.userEmail,
              amountPaid: updatedBooking.amountPaid || 0,
              sport: updatedBooking.sport,
              resourceName: updatedBooking.resourceName,
              date: updatedBooking.date,
              timeRange: updatedBooking.timeRange,
              transactionId: updatedBooking.transactionId,
            },
            'APPROVED',
            baseUrl
          );
        }
      }

      return NextResponse.json({
        success: true,
        action: 'APPROVED',
        message: 'बुकिंग सफलतापूर्वक कन्फर्म कर दी गई है एवं ग्राहक के व्हाट्सएप पर कन्फर्मेशन भेज दिया गया है।',
        booking: updatedBooking,
        clientNotification: clientNotifyResult,
      });
    } else if (normalizedAction === 'reject' || normalizedAction === 'no') {
      const isAlreadyRejected = booking.paymentStatus === 'REJECTED' || booking.status === 'PAYMENT_VERIFICATION_FAILED';

      updatedBooking = StorageService.updateBookingPaymentStatus(
        booking.id,
        'REJECTED',
        'PAYMENT_VERIFICATION_FAILED',
        'WhatsApp 1-Click Rejection by Owner (8142731917)'
      );

      if (updatedBooking) {
        await createFirestoreBooking(updatedBooking).catch((e) =>
          console.warn('[Firestore] Verify sync createFirestoreBooking notice:', e)
        );
        await updateFirestoreBookingStatus(booking.id, 'PAYMENT_VERIFICATION_FAILED', {
          paymentStatus: 'REJECTED',
          verifiedBy: 'WhatsApp 1-Click Owner (8142731917)',
          verifiedAt: new Date().toISOString(),
        }).catch((e) => console.warn('[Firestore] Verify sync notice:', e));

        // Automatically trigger cancellation/rejection message to client's WhatsApp (skip if already rejected)
        if (!isAlreadyRejected) {
          clientNotifyResult = await notifyClientOfBookingDecision(
            {
              id: updatedBooking.id,
              userName: updatedBooking.userName,
              userPhone: updatedBooking.userPhone,
              userEmail: updatedBooking.userEmail,
              amountPaid: updatedBooking.amountPaid || 0,
              sport: updatedBooking.sport,
              resourceName: updatedBooking.resourceName,
              date: updatedBooking.date,
              timeRange: updatedBooking.timeRange,
              transactionId: updatedBooking.transactionId,
            },
            'REJECTED',
            baseUrl
          );
        }
      }

      return NextResponse.json({
        success: true,
        action: 'REJECTED',
        message: 'बुकिंग रिजेक्ट कर दी गई है एवं ग्राहक के व्हाट्सएप पर निरस्तीकरण सूचना भेज दी गई है।',
        booking: updatedBooking,
        clientNotification: clientNotifyResult,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action parameter' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, token } = body;

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'ID and action are required' }, { status: 400 });
    }

    if (!token || !isValidVerificationToken(id, token)) {
      return NextResponse.json(
        { success: false, error: 'अमान्य वेरिफिकेशन टोकन (Invalid token)' },
        { status: 403 }
      );
    }

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = host ? `${proto}://${host}` : undefined;

    const bookings = StorageService.getBookings();
    let booking = bookings.find((b) => b.id.toLowerCase() === id.toLowerCase());

    if (!booking) {
      try {
        const fsBookings = await getFirestoreBookings();
        booking = fsBookings.find((b) => b.id.toLowerCase() === id.toLowerCase());
        if (booking) {
          StorageService.mergeBookings([booking]);
        }
      } catch (fsErr) {
        console.warn('[Firestore] Booking lookup notice:', fsErr);
      }
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, error: `बुकिंग ID '${id}' नहीं मिली` },
        { status: 404 }
      );
    }

    const normalizedAction = action.toLowerCase();
    let updatedBooking = null;
    let clientNotifyResult = null;

    if (normalizedAction === 'approve' || normalizedAction === 'yes') {
      const isAlreadyApproved = booking.paymentStatus === 'APPROVED' && booking.status === 'CONFIRMED';

      updatedBooking = StorageService.updateBookingPaymentStatus(
        id,
        'APPROVED',
        'CONFIRMED',
        'WhatsApp 1-Click Approval by Owner (8142731917)'
      );

      if (updatedBooking) {
        await createFirestoreBooking(updatedBooking).catch((e) =>
          console.warn('[Firestore] Verify sync createFirestoreBooking notice:', e)
        );
        await updateFirestoreBookingStatus(id, 'CONFIRMED', {
          paymentStatus: 'APPROVED',
          verifiedBy: 'WhatsApp 1-Click Owner (8142731917)',
          verifiedAt: new Date().toISOString(),
        }).catch((e) => console.warn('[Firestore] Verify sync notice:', e));

        if (!isAlreadyApproved) {
          clientNotifyResult = await notifyClientOfBookingDecision(
            {
              id: updatedBooking.id,
              userName: updatedBooking.userName,
              userPhone: updatedBooking.userPhone,
              userEmail: updatedBooking.userEmail,
              amountPaid: updatedBooking.amountPaid || 0,
              sport: updatedBooking.sport,
              resourceName: updatedBooking.resourceName,
              date: updatedBooking.date,
              timeRange: updatedBooking.timeRange,
              transactionId: updatedBooking.transactionId,
            },
            'APPROVED',
            baseUrl
          );
        }
      }

      return NextResponse.json({
        success: true,
        action: 'APPROVED',
        message: 'बुकिंग सफलतापूर्वक कन्फर्म कर दी गई है एवं ग्राहक के व्हाट्सएप पर कन्फर्मेशन भेज दिया गया है।',
        booking: updatedBooking,
        clientNotification: clientNotifyResult,
      });
    } else if (normalizedAction === 'reject' || normalizedAction === 'no') {
      const isAlreadyRejected = booking.paymentStatus === 'REJECTED' || booking.status === 'PAYMENT_VERIFICATION_FAILED';

      updatedBooking = StorageService.updateBookingPaymentStatus(
        id,
        'REJECTED',
        'PAYMENT_VERIFICATION_FAILED',
        'WhatsApp 1-Click Rejection by Owner (8142731917)'
      );

      if (updatedBooking) {
        await createFirestoreBooking(updatedBooking).catch((e) =>
          console.warn('[Firestore] Verify sync createFirestoreBooking notice:', e)
        );
        await updateFirestoreBookingStatus(id, 'PAYMENT_VERIFICATION_FAILED', {
          paymentStatus: 'REJECTED',
          verifiedBy: 'WhatsApp 1-Click Owner (8142731917)',
          verifiedAt: new Date().toISOString(),
        }).catch((e) => console.warn('[Firestore] Verify sync notice:', e));

        if (!isAlreadyRejected) {
          clientNotifyResult = await notifyClientOfBookingDecision(
            {
              id: updatedBooking.id,
              userName: updatedBooking.userName,
              userPhone: updatedBooking.userPhone,
              userEmail: updatedBooking.userEmail,
              amountPaid: updatedBooking.amountPaid || 0,
              sport: updatedBooking.sport,
              resourceName: updatedBooking.resourceName,
              date: updatedBooking.date,
              timeRange: updatedBooking.timeRange,
              transactionId: updatedBooking.transactionId,
            },
            'REJECTED',
            baseUrl
          );
        }
      }

      return NextResponse.json({
        success: true,
        action: 'REJECTED',
        message: 'बुकिंग रिजेक्ट कर दी गई है एवं ग्राहक के व्हाट्सएप पर निरस्तीकरण सूचना भेज दी गई है।',
        booking: updatedBooking,
        clientNotification: clientNotifyResult,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

