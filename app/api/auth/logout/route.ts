import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  
  response.cookies.set('user_id', '', {
    httpOnly: true,
    secure: false,
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('username', '', {
    httpOnly: false,
    secure: false,
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('is_authenticated', '', {
    httpOnly: false,
    secure: false,
    path: '/',
    maxAge: 0,
  });

  return response;
}

export async function GET() {
  return POST();
}
