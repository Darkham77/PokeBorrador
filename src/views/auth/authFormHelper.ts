export type ActiveAuthForm = 'online-login' | 'local-login' | 'local-signup' | 'online-signup';

export function resolveActiveAuthForm(serverMode: string, authTab: string): ActiveAuthForm {
  if (serverMode === 'local') {
    return authTab === 'login' ? 'local-login' : 'local-signup';
  }
  return authTab === 'login' ? 'online-login' : 'online-signup';
}

export interface BanStatus {
  readonly isBanned: boolean;
  readonly reason: string;
}

export function parseBanStatus(error: string | null): BanStatus {
  if (!error || !error.startsWith('BAN:')) {
    return { isBanned: false, reason: '' };
  }
  const parts = error.split(':');
  return {
    isBanned: true,
    reason: parts[1]?.trim() || 'Acceso restringido'
  };
}

export function resolveStandardErrorMessage(error: string | null): string | null {
  if (!error || error.startsWith('BAN:')) return null;
  return error;
}
