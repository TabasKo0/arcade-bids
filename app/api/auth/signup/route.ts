import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    let username = '';
    let email = '';
    let password = '';
    let role = 'BOTH';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      username = body.username;
      email = body.email;
      password = body.password;
      role = body.role || 'BOTH';
    } else {
      const formData = await request.formData();
      username = formData.get('username') as string;
      email = formData.get('email') as string;
      password = formData.get('password') as string;
      role = (formData.get('role') as string) || 'BOTH';
    }

    username = username ? username.trim() : '';
    email = email ? email.trim() : '';
    password = password ? password : '';

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO USERS (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, role, rating_score',
      [username, email, hashedPassword, role]
    );

    const user = result.rows[0];
    const userIdStr = user.user_id.toString();

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        user_id: userIdStr,
        username: user.username,
        email: user.email,
        role: user.role,
        rating_score: user.rating_score,
      },
    });

    // 1. Set httpOnly session cookie
    response.cookies.set('user_id', userIdStr, {
      httpOnly: true,
      secure: false, // Allows local development over HTTP without silent browser cookie rejection
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    // 2. Set client-readable cookies for browser visibility
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
    console.error('Signup API error:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Username or email already exists. Please use a different one.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during signup.' },
      { status: 500 }
    );
  }
}
