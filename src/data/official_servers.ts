/**
 * OFFICIAL SERVERS CONFIGURATION
 * Lista de servidores registrados para la GUI de Login.
 */

export interface OfficialServer {
  id: string;
  name: string;
  region: string;
  url: string;
  anonKey: string;
  isDefault?: boolean;
}

export const OFFICIAL_SERVERS: OfficialServer[] = [
  {
    id: 'official-prod',
    name: 'Poké Vicio Oficial',
    region: 'Global / Cloud',
    // Usamos las variables del .env para producción por defecto
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_KEY || '',
    isDefault: true
  },
  {
    id: 'local-docker',
    name: 'Servidor Dev (Docker)',
    region: 'Desarrollo',
    url: 'http://localhost:8000',
    // Esta es la llave anon por defecto de la instancia Docker local
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBva2V2aWNpbyIsInJvbGUiOiJhbm9uIiwiaWF0IjoyNTI0NjA4MDAwLCJleHAiOjI1MjQ2MDgwMDB9.dummy-anon-key',
  }
];

export const DEFAULT_SERVER = (OFFICIAL_SERVERS.find(s => s.isDefault) || OFFICIAL_SERVERS[0]) as OfficialServer;
