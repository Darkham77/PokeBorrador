import type { ItemEffectResult } from '@/types/inventory/items';

export interface BuildItemResultOptions {
  resType?: ItemEffectResult['resultType'];
  isDeferred?: boolean;
}

export function buildItemResult(
  ok: boolean,
  msg: string,
  options?: BuildItemResultOptions
): ItemEffectResult {
  const result: ItemEffectResult = {
    success: ok,
    message: msg
  };
  if (options?.resType) {
    result.resultType = options.resType;
  }
  if (options?.isDeferred !== undefined) {
    result.deferred = options.isDeferred;
  }
  return result;
}
