import type { GenderId } from '@/types/system/game';

export type UserRole = 'user' | 'admin';

const USER_ROLES = ['user', 'admin'] as const satisfies readonly UserRole[];

function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value); // domain-ok
}

export function requireUserRole(value: string): UserRole {
  if (isUserRole(value)) return value;
  throw new Error(`Invalid user role: ${value}`);
}

export interface AuthUser {
  id: string; // domain-ok
  email?: string; // domain-ok
  user_metadata?: {
    username?: string; // domain-ok
    full_name?: string; // domain-ok
    role?: UserRole;
    gender?: GenderId;
    [key: string]: unknown; // open-record
  };
  last_save_id?: string; // domain-ok
  db_version?: number;
  role?: UserRole;
}

export type SessionMode = 'online' | 'offline';
