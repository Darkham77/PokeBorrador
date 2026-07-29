export type UserRole = 'user' | 'admin';

export const USER_ROLES = ['user', 'admin'] as const satisfies readonly UserRole[];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

export function requireUserRole(value: string): UserRole {
  if (isUserRole(value)) return value;
  throw new Error(`Invalid user role: ${value}`);
}

export interface AuthUser {
  id: string; // domain-ok
  email?: string; // domain-ok
  user_metadata: {
    username: string; // domain-ok
    full_name?: string; // domain-ok
    role?: UserRole;
    gender?: 'h' | 'm';
  };
  last_save_id?: string; // domain-ok
  db_version?: number;
  role?: UserRole;
}

export type SessionMode = 'online' | 'offline';
