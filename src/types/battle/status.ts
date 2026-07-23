export interface UnifiedStatusItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
  type?: string;
  class?: string;
  isBoosted?: boolean;
  emoji?: string;
  stageValue?: number;
  count?: string | number;
  isAdminOnly?: boolean;
}

export interface AdminStatConfigItem {
  key: string;
  label: string;
  icon: string;
}
