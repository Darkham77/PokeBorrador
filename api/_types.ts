export interface ApiRequest {
  method: string;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
}

// More specific body type for entries
export interface CompetitionEntryBody {
  event_id: string;
  player_name: string;
  player_email: string;
  data: {
    total_ivs?: number;
    [key: string]: unknown;
  };
}
