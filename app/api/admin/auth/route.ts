import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Secure Admin credentials for Kuchaman Sports Academy
    // Default admin login credentials: admin / ksa@2026 or ksaadmin / kuchaman2026
    const validUsers = [
      { user: 'admin', pass: 'ksa2026' },
      { user: 'ksaadmin', pass: 'kuchaman2026' },
      { user: 'coach', pass: 'coach2026' },
    ];

    const match = validUsers.find(
      (v) => v.user.toLowerCase() === (username || '').trim().toLowerCase() && v.pass === (password || '').trim()
    );

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Invalid administrator credentials. Access restricted.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      token: `ksa_token_${Date.now()}`,
      user: {
        username: match.user,
        role: 'ACADEMY_DIRECTOR',
        academy: 'Kuchaman Sports Academy',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
