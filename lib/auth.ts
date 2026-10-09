import { cookies } from 'next/headers';

export async function getSessionUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('user_id');
  if (sessionCookie && sessionCookie.value) {
    return parseInt(sessionCookie.value, 10);
  }
  return null;
}
