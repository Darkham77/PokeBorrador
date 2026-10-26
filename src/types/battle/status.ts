import type { DisplayText, CssClassName, AssetUri } from '@francogp/auditor';

export interface UnifiedStatusItem {
  id: DisplayText;
  title: DisplayText;
  description: DisplayText;
  icon?: AssetUri;
  type?: DisplayText;
  class?: CssClassName;
  isBoosted?: boolean;
  emoji?: DisplayText;
  stageValue?: number;
  count?: DisplayText | number;
  isAdminOnly?: boolean;
}

export interface AdminStatConfigItem {
  key: DisplayText;
  label: DisplayText;
  icon: AssetUri;
}
