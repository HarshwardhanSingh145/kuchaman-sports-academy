import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { getFirestoreConfig } from '@/lib/firestore-service';

export async function GET() {
  try {
    let config = StorageService.getConfig();
    // Attempt Firestore fetch
    try {
      const fsConfig = await getFirestoreConfig();
      if (fsConfig) {
        config = { ...config, ...fsConfig };
      }
    } catch {
      // fallback to memory/file
    }

    if (!config.bigBoxOpeningTime) config.bigBoxOpeningTime = '06:00 AM';
    if (!config.bigBoxClosingTime) config.bigBoxClosingTime = '02:00 AM';
    if (config.bigBoxPricing && !config.bigBoxPricing.some((t) => t.hours === 4)) {
      config.bigBoxPricing.push({ id: 'tier-4', hours: 4, label: '4 Hours', price: 3200 });
    }

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
