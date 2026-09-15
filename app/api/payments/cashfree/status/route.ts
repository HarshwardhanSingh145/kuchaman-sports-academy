import { NextResponse } from 'next/server';
import { getCashfreeConfig } from '@/lib/cashfree';

export async function GET() {
  const config = getCashfreeConfig();

  return NextResponse.json({
    success: true,
    configured: !!config,
    env: config ? config.env : (process.env.NEXT_PUBLIC_CASHFREE_ENV || 'sandbox'),
  });
}
