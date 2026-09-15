import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { isValidVerificationToken } from '@/lib/notifications';
import { updateFirestoreBookingStatus } from '@/lib/firestore-service';

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

    const bookings = StorageService.getBookings();
    const booking = bookings.find((b) => b.id.toLowerCase() === id.toLowerCase());

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

    if (normalizedAction === 'approve' || normalizedAction === 'yes') {
      updatedBooking = StorageService.updateBookingPaymentStatus(
        booking.id,
        'APPROVED',
        'CONFIRMED',
        'WhatsApp 1-Click Approval by Owner (8142731917)'
      );
      if (updatedBooking) {
        await updateFirestoreBookingStatus(booking.id, 'CONFIRMED', {
          paymentStatus: 'APPROVED',
          verifiedBy: 'WhatsApp 1-Click Owner (8142731917)',
          verifiedAt: new Date().toISOString(),
        }).catch((e) => console.warn('[Firestore] Verify sync notice:', e));
      }
      return NextResponse.json({
        success: true,
        action: 'APPROVED',
        message: 'बुकिंग सफलतापूर्वक कन्फर्म कर दी गई है (Booking confirmed successfully)',
        booking: updatedBooking,
      });
    } else if (normalizedAction === 'reject' || normalizedAction === 'no') {
      updatedBooking = StorageService.updateBookingPaymentStatus(
        booking.id,
        'REJECTED',
        'PAYMENT_VERIFICATION_FAILED',
        'WhatsApp 1-Click Rejection by Owner (8142731917)'
      );
      if (updatedBooking) {
        await updateFirestoreBookingStatus(booking.id, 'PAYMENT_VERIFICATION_FAILED', {
          paymentStatus: 'REJECTED',
          verifiedBy: 'WhatsApp 1-Click Owner (8142731917)',
          verifiedAt: new Date().toISOString(),
        }).catch((e) => console.warn('[Firestore] Verify sync notice:', e));
      }
      return NextResponse.json({
        success: true,
        action: 'REJECTED',
        message: 'बुकिंग रिजेक्ट कर दी गई है (Booking rejected)',
        booking: updatedBooking,
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

    const normalizedAction = action.toLowerCase();
    let updatedBooking = null;

    if (normalizedAction === 'approve' || normalizedAction === 'yes') {
      updatedBooking = StorageService.updateBookingPaymentStatus(
        id,
        'APPROVED',
        'CONFIRMED',
        'WhatsApp 1-Click Approval by Owner (8142731917)'
      );
      if (updatedBooking) {
        await updateFirestoreBookingStatus(id, 'CONFIRMED', {
          paymentStatus: 'APPROVED',
          verifiedBy: 'WhatsApp 1-Click Owner (8142731917)',
          verifiedAt: new Date().toISOString(),
        }).catch((e) => console.warn('[Firestore] Verify sync notice:', e));
      }
      return NextResponse.json({
        success: true,
        action: 'APPROVED',
        message: 'बुकिंग सफलतापूर्वक कन्फर्म कर दी गई है',
        booking: updatedBooking,
      });
    } else if (normalizedAction === 'reject' || normalizedAction === 'no') {
      updatedBooking = StorageService.updateBookingPaymentStatus(
        id,
        'REJECTED',
        'PAYMENT_VERIFICATION_FAILED',
        'WhatsApp 1-Click Rejection by Owner (8142731917)'
      );
      if (updatedBooking) {
        await updateFirestoreBookingStatus(id, 'PAYMENT_VERIFICATION_FAILED', {
          paymentStatus: 'REJECTED',
          verifiedBy: 'WhatsApp 1-Click Owner (8142731917)',
          verifiedAt: new Date().toISOString(),
        }).catch((e) => console.warn('[Firestore] Verify sync notice:', e));
      }
      return NextResponse.json({
        success: true,
        action: 'REJECTED',
        message: 'बुकिंग रिजेक्ट कर दी गई है',
        booking: updatedBooking,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
