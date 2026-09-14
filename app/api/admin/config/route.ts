import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { saveFirestoreConfig, getFirestoreConfig } from '@/lib/firestore-service';

export async function GET() {
  try {
    try {
      const firestoreConfig = await getFirestoreConfig();
      if (firestoreConfig) {
        StorageService.updateConfig(firestoreConfig);
      }
    } catch (fsErr) {
      console.warn('Notice syncing admin config from Firestore:', fsErr);
    }
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
      const latestConfig = StorageService.getConfig();
      try {
        await saveFirestoreConfig(latestConfig);
      } catch (err) {
        console.warn('Firestore timing block sync notice:', err);
      }
      return NextResponse.json({
        success: true,
        message: 'Date-specific time slot blocked successfully',
        block: newBlock,
        config: latestConfig,
      });
    }

    if (action === 'deleteDateBlock' && blockId) {
      const removed = StorageService.deleteDateSpecificBlock(blockId);
      const latestConfig = StorageService.getConfig();
      try {
        await saveFirestoreConfig(latestConfig);
      } catch (err) {
        console.warn('Firestore timing block sync notice:', err);
      }
      return NextResponse.json({
        success: removed,
        message: removed ? 'Slot unblocked successfully' : 'Block not found',
        config: latestConfig,
      });
    }

    if (action === 'toggleBlockedHour' && typeof toggleHour === 'number') {
      const updatedHours = StorageService.toggleBlockedHour(toggleHour);
      const latestConfig = StorageService.getConfig();
      try {
        await saveFirestoreConfig(latestConfig);
      } catch (err) {
        console.warn('Firestore timing block sync notice:', err);
      }
      return NextResponse.json({
        success: true,
        message: 'Blocked hour updated',
        blockedHours: updatedHours,
        config: latestConfig,
      });
    }

    const updatedConfig = StorageService.updateConfig({
      ...(upiQrCodeUrl !== undefined ? { upiQrCodeUrl } : {}),
      ...(upiId !== undefined ? { upiId } : {}),
      ...(upiAccountName !== undefined ? { upiAccountName } : {}),
      ...(bankName !== undefined ? { bankName } : {}),
      ...(paymentInstructions !== undefined ? { paymentInstructions } : {}),
      ...(paymentNotes !== undefined ? { paymentInstructions: paymentNotes, paymentNotes } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(discountPopup !== undefined ? { discountPopup } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(operatingHours !== undefined ? { operatingHours } : {}),
      ...(hourlyRates !== undefined ? { hourlyRates } : {}),
      ...(bookingTiming !== undefined ? { bookingTiming } : {}),
    });

    try {
      await saveFirestoreConfig(updatedConfig);
    } catch (err) {
      console.warn('Firestore config update notice:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Academy payment configuration and QR Code updated successfully!',
      config: updatedConfig,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
