import type { DisplayText } from '@francogp/auditor';

export interface DebugTool {
  id: DisplayText;
  command: DisplayText;
  action: (...args: never[]) => unknown;
  label?: DisplayText;
  category?: DisplayText;
  description?: DisplayText;
}

export interface DebugSystem {
  register: (config: DebugTool) => void;
  unregister?: (id: DisplayText) => void;
  fastRankedDelay?: boolean;
}
