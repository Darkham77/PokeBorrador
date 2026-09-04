export interface UnifiedStatusItem {
  id: string; // domain-ok: Open dynamic text or non-domain string payload
  title: string; // domain-ok: Open dynamic text or non-domain string payload
  description: string; // domain-ok: Open dynamic text or non-domain string payload
  icon?: string; // domain-ok: Open dynamic text or non-domain string payload
  type?: string; // domain-ok: Open dynamic text or non-domain string payload
  class?: string; // domain-ok: Open dynamic text or non-domain string payload
  isBoosted?: boolean;
  emoji?: string; // domain-ok: Open dynamic text or non-domain string payload
  stageValue?: number;
  count?: string | number; // domain-ok: Open dynamic text or non-domain string payload
  isAdminOnly?: boolean;
}

export interface AdminStatConfigItem {
  key: string; // domain-ok: Open dynamic text or non-domain string payload
  label: string; // domain-ok: Open dynamic text or non-domain string payload
  icon: string; // domain-ok: Open dynamic text or non-domain string payload
}
