
export type DBMode = 'online' | 'offline';

export interface DBConfig {
  url?: string;
  key?: string;
}

export interface DBRouterOptions {
  inMemory?: boolean;
  [key: string]: any;
}

export interface DBResponse<T = any> {
  data: T | null;
  error: any | null;
}

export interface DBCompatibilityResponse {
  compatible: boolean;
  client: number;
  db: number;
  error?: string;
}

export interface ProxyQueryChainItem {
  type: string;
  args: any[];
}
