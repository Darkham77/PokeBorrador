/**
 * Environment detection utilities.
 * Identifies whether the current runtime is operating in a local development context
 * (localhost, private network LAN IP, or Vite DEV server).
 */

export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.DEV) return true;

  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
  );
}
