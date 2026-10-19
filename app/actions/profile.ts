'use server';

import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function updateProfile(state: any, formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) {
    return { error: 'Not authenticated.' };
  }

  const username = formData.get('username') as string;
  const email = formData.get('email') as string;

  if (!username || !email) {
    return { error: 'Username and email are required.' };
  }

  try {
    await pool.query(
      'UPDATE USERS SET username = $1, email = $2 WHERE user_id = $3',
      [username, email, userId]
    );
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('Update profile error:', error);
    if (error.code === '23505') {
      return { error: 'Username or email already exists.' };
    }
    return { error: 'An unexpected error occurred.' };
  }
}

export async function deleteAccount() {
  const userId = await getSessionUserId();
  if (!userId) {
    return { error: 'Not authenticated.' };
  }

  try {
    await pool.query('DELETE FROM USERS WHERE user_id = $1', [userId]);
    const cookieStore = await cookies();
    cookieStore.delete('user_id');
  } catch (error: any) {
    console.error('Delete account error:', error);
    return { error: 'An unexpected error occurred.' };
  }

  redirect('/');
}
