import type { GenderId } from '@/types/system/game';

export type UserRole = 'user' | 'admin';

const USER_ROLES = ['user', 'admin'] as const satisfies readonly UserRole[];

function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value); // domain-ok: Open dynamic text or non-domain string payload
}

export function requireUserRole(value: string): UserRole {
  if (isUserRole(value)) return value;
  throw new Error(`Invalid user role: ${value}`);
}

export interface AuthUser {
  id: string; // domain-ok: Open dynamic text or non-domain string payload
  email?: string; // domain-ok: Open dynamic text or non-domain string payload
  user_metadata?: {
    username?: string; // domain-ok: Open dynamic text or non-domain string payload
    full_name?: string; // domain-ok: Open dynamic text or non-domain string payload
    role?: UserRole;
    gender?: GenderId;
    [key: string]: unknown; // open-record: Generic key-value data dictionary container
  };
  last_save_id?: string; // domain-ok: Open dynamic text or non-domain string payload
  db_version?: number;
  role?: UserRole;
}

export type SessionMode = 'online' | 'offline';

export const SERVER_CONNECTION_STATUSES = ['checking', 'online', 'offline'] as const;
export type ServerConnectionStatus = (typeof SERVER_CONNECTION_STATUSES)[number];
