export interface AuthUser {
  id: string;
  email?: string;
  user_metadata: {
    username: string;
    full_name?: string;
    role?: string;
  };
  last_save_id?: string;
  db_version: number;
  role?: string;
}

export type SessionMode = 'online' | 'offline';

export type PVPQueue = 'casual' | 'ranked';

export type ShopIndex = number;

export type PlayerClassIndex = number;
