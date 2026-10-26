import type { DisplayText } from '@francogp/auditor';

import type { GenderId } from '@/types/system/game';

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];
const USER_ROLES_SET: ReadonlySet<UserRole> = new Set<UserRole>(USER_ROLES);

function isUserRole(value: string): value is UserRole {
  return USER_ROLES_SET.has(value as UserRole);
}

export function requireUserRole(value: string): UserRole {
  if (isUserRole(value)) return value;
  throw new Error(`Invalid user role: ${value}`);
}

export interface AuthUser {
  id: DisplayText;
  email?: DisplayText;
  user_metadata?: {
    username?: DisplayText;
    full_name?: DisplayText;
    role?: UserRole;
    gender?: GenderId;
    [key: DisplayText]: unknown;
  };
  last_save_id?: DisplayText;
  db_version?: number;
  role?: UserRole;
}

export type SessionMode = 'online' | 'offline';

export const SERVER_CONNECTION_STATUSES = ['checking', 'online', 'offline'] as const;
export type ServerConnectionStatus = (typeof SERVER_CONNECTION_STATUSES)[number];
