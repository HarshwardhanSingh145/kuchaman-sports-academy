import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { getFirestoreConfig } from '@/lib/firestore-service';

export async function GET() {
  try {
    try {
      const firestoreConfig = await getFirestoreConfig();
      if (firestoreConfig) {
        StorageService.updateConfig(firestoreConfig);
      }
    } catch (fsErr) {
      console.warn('Notice syncing config from Firestore:', fsErr);
    }
    const config = StorageService.getConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
