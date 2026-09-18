export interface DebugTool {
  id: string // domain-ok: Open dynamic text or non-domain string payload
  command: string // domain-ok: Open dynamic text or non-domain string payload
  action: (...args: never[]) => unknown
  label?: string // domain-ok: Open dynamic text or non-domain string payload
  category?: string // domain-ok: Open dynamic text or non-domain string payload
  description?: string // domain-ok: Open dynamic text or non-domain string payload
}

export interface DebugSystem {
  register: (config: DebugTool) => void
  unregister?: (id: string) => void
  fastRankedDelay?: boolean
}
