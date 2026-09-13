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

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
