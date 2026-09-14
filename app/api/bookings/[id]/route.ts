import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { updateFirestoreBookingStatus, deleteFirestoreBooking } from '@/lib/firestore-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 });
    }

    const bookings = StorageService.getBookings();
    const booking = bookings.find((b) => b.id.toLowerCase() === id.toLowerCase());
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { status, paymentStatus, verifiedBy } = body;

    let updated = null;
    if (paymentStatus) {
      updated = StorageService.updateBookingPaymentStatus(id, paymentStatus, status, verifiedBy);
    } else if (status) {
      updated = StorageService.updateBookingStatus(id, status);
    } else {
      return NextResponse.json(
        { success: false, error: 'Either status or paymentStatus must be provided' },
        { status: 400 }
      );
    }

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Sync Firestore
    const paymentUpdates: Record<string, any> = {};
    if (updated.paymentStatus) paymentUpdates.paymentStatus = updated.paymentStatus;
    if (updated.verifiedAt) paymentUpdates.verifiedAt = updated.verifiedAt;
    if (updated.verifiedBy) paymentUpdates.verifiedBy = updated.verifiedBy;

    try {
      await updateFirestoreBookingStatus(id, updated.status, paymentUpdates);
    } catch (err) {
      console.warn('Firestore booking status update sync notice:', err);
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${id} updated successfully`,
      booking: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 });
    }

    const deleted = StorageService.deleteBooking(id);
    try {
      await deleteFirestoreBooking(id);
    } catch (err) {
      console.warn('Firestore booking deletion notice:', err);
    }

    return NextResponse.json({
      success: true,
      message: deleted ? `Booking ${id} deleted successfully` : `Booking ${id} removed`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
