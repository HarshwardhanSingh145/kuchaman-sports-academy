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
    const { upiQrCodeUrl, upiId, upiAccountName, bankName, paymentInstructions, phone, email, bigBoxPricing } = body;

    const updatedConfig = StorageService.updateConfig({
      ...(upiQrCodeUrl !== undefined ? { upiQrCodeUrl } : {}),
      ...(upiId !== undefined ? { upiId } : {}),
      ...(upiAccountName !== undefined ? { upiAccountName } : {}),
      ...(bankName !== undefined ? { bankName } : {}),
      ...(paymentInstructions !== undefined ? { paymentInstructions } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(bigBoxPricing !== undefined ? { bigBoxPricing } : {}),
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
