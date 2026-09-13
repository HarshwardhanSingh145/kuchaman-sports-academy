import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { getFirestoreConfig } from '@/lib/firestore-service';

export async function GET() {
  try {
    const config = await getFirestoreConfig();
    return NextResponse.json({
      status: 'connected',
      firestore: true,
      message: 'Google Cloud Firestore is online and active.',
      academy: config?.name || 'Kuchaman Sports Academy',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        firestore: false,
        error: error.message || 'Firestore connection issue',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await StorageService.forceSyncCloud();
    return NextResponse.json({
      success: true,
      message: 'All data successfully synchronized with Google Cloud Firestore.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync with Firestore',
      },
      { status: 500 }
    );
  }
}
