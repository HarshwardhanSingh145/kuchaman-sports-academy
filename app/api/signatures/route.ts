import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function GET() {
  try {
    const config = StorageService.getSignatureConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ownerName, ownerTitle, ownerSignatureUrl, academySealUrl } = body;

    const updated = StorageService.updateSignatureConfig({
      ...(ownerName ? { ownerName } : {}),
      ...(ownerTitle ? { ownerTitle } : {}),
      ...(ownerSignatureUrl ? { ownerSignatureUrl } : {}),
      ...(academySealUrl ? { academySealUrl } : {}),
    });

    return NextResponse.json({ success: true, config: updated, message: 'Signatures configuration updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
