import { Temporal } from '@js-temporal/polyfill'
import type { ApiRequest, ApiResponse } from './_types.ts'

export default function handler(_req: ApiRequest, res: ApiResponse) {
  res.status(200).json({
    now: Temporal.Now.instant().epochMilliseconds
  });
}
