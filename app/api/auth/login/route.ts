import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    let email = '';
    let password = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } else {
      const formData = await request.formData();
      email = formData.get('email') as string;
      password = formData.get('password') as string;
    }

    email = email ? email.trim() : '';
    password = password ? password : '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'SELECT user_id, username, email, password_hash, role, rating_score FROM USERS WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    let passwordMatch = false;

    // Verify bcrypt hash or support dev seed dummy passwords
    if (
      user.password_hash.startsWith('$2a$') ||
      user.password_hash.startsWith('$2b$') ||
      user.password_hash.startsWith('$2y$')
    ) {
      passwordMatch = await bcrypt.compare(password, user.password_hash);
    } else {
      passwordMatch = password === user.password_hash || password === 'password';
      if (passwordMatch) {
        // Upgrade legacy/seed plain password to bcrypt in background
        const upgradedHash = await bcrypt.hash(password, 10);
        pool.query('UPDATE USERS SET password_hash = $1 WHERE user_id = $2', [upgradedHash, user.user_id]).catch(console.error);
      }
    }

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const userIdStr = user.user_id.toString();

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully',
      user: {
        user_id: userIdStr,
        username: user.username,
        email: user.email,
        role: user.role,
        rating_score: user.rating_score,
      },
    });

    // 1. Set httpOnly session cookie for server authentication
    response.cookies.set('user_id', userIdStr, {
      httpOnly: true,
      secure: false, // Allows local development over HTTP without silent browser cookie rejection
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    // 2. Set client-readable cookies for browser visibility in document.cookie / DevTools
    response.cookies.set('username', user.username, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set('is_authenticated', 'true', {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}
