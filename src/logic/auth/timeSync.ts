import { gsap } from 'gsap';
import { safeStorage } from '@/logic/utils/storage.ts';
import { logger } from '@/logic/utils/logger.ts';
import { setServerTimeOffsetNanoseconds, setServerTimeSynced } from '@/logic/utils/timeUtils.ts';

export async function syncServerTime(): Promise<void> {
  if (typeof window !== 'undefined' && safeStorage.getItem('pokevicio_session_mode') === 'offline') {
    setServerTimeSynced(true);
    return;
  }

  try {
    const { supabase } = await import('@/logic/db/supabase.ts');
    const result = await Promise.race([
      supabase.rpc('fn_get_server_time'),
      new Promise((_, reject) => gsap.delayedCall(3, () => reject(new Error('FETCH_TIMEOUT'))))
    ]);

    const { data: serverTime, error } = result as { data: string | null; error: { message: string } | null };

    if (error) throw new Error(error.message);
    if (!serverTime) throw new Error('NO_SERVER_TIME_RETURNED');

    const serverInstant = Temporal.Instant.from(serverTime);
    const localInstant = Temporal.Now.instant();

    const offset = BigInt(serverInstant.epochNanoseconds) - BigInt(localInstant.epochNanoseconds);
    setServerTimeOffsetNanoseconds(offset);
    setServerTimeSynced(true);

    const NANOSECONDS_PER_MILLISECOND = 1000000;
    logger.info('TIME', `Server Sync Completed. Offset: ${offset / BigInt(NANOSECONDS_PER_MILLISECOND)}ms`);
  } catch (_err) {
    if (typeof window !== 'undefined' && safeStorage.getItem('pokevicio_session_mode') !== 'offline') {
      logger.warn('TIME', 'Failed to sync with server, using local time.');
    }
    setServerTimeSynced(true);
  }
}
