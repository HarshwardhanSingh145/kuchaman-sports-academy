import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { saveFirestoreConfig } from '@/lib/firestore-service';

export async function GET() {
  try {
    const config = StorageService.getConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      upiQrCodeUrl,
      upiId,
      upiAccountName,
      bankName,
      paymentInstructions,
      paymentNotes,
      phone,
      email,
      discountPopup,
      name,
      operatingHours,
      hourlyRates,
      bookingTiming,
      action,
      blockData,
      blockId,
      toggleHour,
    } = body;

    // Handle specific timing block actions
    if (action === 'addDateBlock' && blockData) {
      const newBlock = StorageService.addDateSpecificBlock(blockData);
      return NextResponse.json({
        success: true,
        message: 'Date-specific time slot blocked successfully',
        block: newBlock,
        config: StorageService.getConfig(),
      });
    }

    if (action === 'deleteDateBlock' && blockId) {
      const removed = StorageService.deleteDateSpecificBlock(blockId);
      return NextResponse.json({
        success: removed,
        message: removed ? 'Slot unblocked successfully' : 'Block not found',
        config: StorageService.getConfig(),
      });
    }

    if (action === 'toggleBlockedHour' && typeof toggleHour === 'number') {
      const updatedHours = StorageService.toggleBlockedHour(toggleHour);
      return NextResponse.json({
        success: true,
        message: 'Blocked hour updated',
        blockedHours: updatedHours,
        config: StorageService.getConfig(),
      });
    }

    const updatedConfig = StorageService.updateConfig({
      ...(upiQrCodeUrl !== undefined ? { upiQrCodeUrl } : {}),
      ...(upiId !== undefined ? { upiId } : {}),
      ...(upiAccountName !== undefined ? { upiAccountName } : {}),
      ...(bankName !== undefined ? { bankName } : {}),
      ...(paymentInstructions !== undefined ? { paymentInstructions } : {}),
      ...(paymentNotes !== undefined ? { paymentInstructions: paymentNotes } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(discountPopup !== undefined ? { discountPopup } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(operatingHours !== undefined ? { operatingHours } : {}),
      ...(hourlyRates !== undefined ? { hourlyRates } : {}),
      ...(bookingTiming !== undefined ? { bookingTiming } : {}),
    });

    saveFirestoreConfig(updatedConfig).catch((err) => {
      console.warn('Firestore config update notice:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Academy payment configuration and QR Code updated successfully!',
      config: updatedConfig,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
