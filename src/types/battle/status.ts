export interface UnifiedStatusItem {
  id: string; // domain-ok
  title: string; // domain-ok
  description: string; // domain-ok
  icon?: string; // domain-ok
  type?: string; // domain-ok
  class?: string; // domain-ok
  isBoosted?: boolean;
  emoji?: string; // domain-ok
  stageValue?: number;
  count?: string | number; // domain-ok
  isAdminOnly?: boolean;
}

export interface AdminStatConfigItem {
  key: string; // domain-ok
  label: string; // domain-ok
  icon: string; // domain-ok
}
