export interface AuthUser {
  id: string;
  email?: string;
  user_metadata: {
    username: string;
    full_name?: string;
    role?: string;
    gender?: 'h' | 'm';
  };
  last_save_id?: string;
  db_version?: number;
  role?: string;
}

export type SessionMode = 'online' | 'offline';
