import type { SupabaseClient } from '@supabase/supabase-js';

import type { SessionMode } from '@/types/system/database';

import { logger } from '../utils/logger.ts';
import { GAME_TIMEZONE } from '../utils/timeUtils.ts';

const MIN_TIMESTAMP_MS_STRING_LENGTH = 10 as const;

export class DBTimeCoordinator {
  private _timeOffset = 0;

  public constructor() {
    this.getTimeOffset = this.getTimeOffset.bind(this);
    const win = typeof globalThis.window !== 'undefined' ? globalThis.window : null;
    if (win) {
      win.__GET_DB_TIME_OFFSET__ = () => this.getTimeOffset();
    }
  }

  public get timeOffset(): number {
    return this._timeOffset;
  }

  public setTimeOffset(ms: number): void {
    this._timeOffset = ms;
    if (typeof globalThis.window !== 'undefined') {
      globalThis.dispatchEvent(new CustomEvent('time-sync-update', { detail: { offset: ms } }));
    }
    logger.info('DBRouter', `Time offset set to: ${ms}ms`);
  }

  public setMockTime(dateStr: string): void {
    try {
      const clean = dateStr.trim();
      const num = Number(clean);
      let targetDate: Temporal.Instant;
      if (
        !isNaN(num) &&
        clean.length >= MIN_TIMESTAMP_MS_STRING_LENGTH &&
        !clean.includes('-') &&
        !clean.includes('T')
      ) {
        targetDate = Temporal.Instant.fromEpochMilliseconds(num);
      } else {
        try {
          targetDate = Temporal.Instant.from(clean);
        } catch {
          const isoClean = clean.replace(' ', 'T');
          targetDate = Temporal.PlainDateTime.from(isoClean)
            .toZonedDateTime(GAME_TIMEZONE)
            .toInstant();
        }
      }
      const offset = targetDate.epochMilliseconds - Temporal.Now.instant().epochMilliseconds;
      this.setTimeOffset(offset);
    } catch (e) {
      throw new Error(`[DBRouter] Invalid mock time format '${dateStr}': ${(e as Error).message}`, {
        cause: e
      });
    }
  }

  public resetTime(): void {
    this.setTimeOffset(0);
  }

  public getTimeOffset(): number {
    return this._timeOffset || 0;
  }

  public async getServerTime(mode: SessionMode, client: SupabaseClient | null): Promise<number> {
    const baseTime = await this._getRawServerTime(mode, client);
    const offset = mode === 'offline' ? this._timeOffset || 0 : 0;
    return baseTime + offset;
  }

  public async _getRawServerTime(
    mode: SessionMode,
    client: SupabaseClient | null
  ): Promise<number> {
    if (mode === 'offline' || !client) {
      return Temporal.Now.instant().epochMilliseconds;
    }

    try {
      const res = (await client.rpc('fn_get_server_time')) as { data: unknown; error: unknown };
      const { data, error } = res;
      if (!error && data) {
        if (typeof data === 'string') {
          return Temporal.Instant.from(data).epochMilliseconds;
        }
        if (typeof data === 'number' && Number.isFinite(data)) {
          return Temporal.Instant.fromEpochMilliseconds(data).epochMilliseconds;
        }
      }

      throw new Error(`[DBRouter] fn_get_server_time RPC returned error: ${String(error)}`);
    } catch (e) {
      throw new Error(`[DBRouter] getServerTime RPC error: ${(e as Error).message}`, { cause: e });
    }
  }
}
