'use server';

import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signup(state: any, formData: FormData) {
  const username = formData.get('username') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string || 'BOTH';

  if (!username || !email || !password) {
    return { error: 'All fields are required.' };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO USERS (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id',
      [username, email, hashedPassword, role]
    );

    const user = result.rows[0];
    const cookieStore = await cookies();
    cookieStore.set('user_id', user.user_id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.code === '23505') {
      return { error: 'Username or email already exists.' };
    }
    return { error: 'An unexpected error occurred during signup.' };
  }

  redirect('/');
}

export async function login(state: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const result = await pool.query('SELECT user_id, password_hash FROM USERS WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return { error: 'Invalid credentials.' };
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return { error: 'Invalid credentials.' };
    }

    const cookieStore = await cookies();
    cookieStore.set('user_id', user.user_id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'An unexpected error occurred during login.' };
  }

  redirect('/');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('user_id');
  redirect('/');
}
