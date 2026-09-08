// src/types/rewards/rewards.ts

export const UNIFIED_REWARD_SOURCES = [
  'event',
  'ranked_milestone',
  'class_mission',
  'gts_claim'
] as const

export type UnifiedRewardSource = (typeof UNIFIED_REWARD_SOURCES)[number]

export interface UnifiedRewardCategoryBadge {
  readonly icon: string // domain-ok: Open dynamic text or non-domain string payload
  readonly name: string // domain-ok: Open dynamic text or non-domain string payload
}

export const UNIFIED_REWARD_PILL_COLOR_CLASSES = [
  'money',
  'bc',
  'item',
  'pokemon',
  'special'
] as const

export type UnifiedRewardPillColorClass = (typeof UNIFIED_REWARD_PILL_COLOR_CLASSES)[number]

export interface UnifiedRewardPill {
  readonly id: string // domain-ok: Open dynamic text or non-domain string payload
  readonly label: string // domain-ok: Open dynamic text or non-domain string payload
  readonly qtyText?: string // domain-ok: Open dynamic text or non-domain string payload
  readonly icon?: string // domain-ok: Open dynamic text or non-domain string payload
  readonly spriteUrl?: string // domain-ok: Open dynamic text or non-domain string payload
  readonly description?: string // domain-ok: Open dynamic text or non-domain string payload
  readonly colorClass?: UnifiedRewardPillColorClass
}

export interface UnifiedRewardItem {
  readonly id: string // domain-ok: Open dynamic text or non-domain string payload
  readonly source: UnifiedRewardSource
  readonly title: string // domain-ok: Open dynamic text or non-domain string payload
  readonly subtitle?: string // domain-ok: Open dynamic text or non-domain string payload
  readonly categoryBadge?: UnifiedRewardCategoryBadge | null
  readonly isLegacy?: boolean
  readonly isClaimable: boolean
  readonly prize: Record<string, unknown> // open-record: Generic key-value data dictionary container
  readonly pills: readonly UnifiedRewardPill[]
  readonly rawData?: unknown
}

export interface UnifiedRewardsSummary {
  readonly totalClaimable: number
  readonly totalActionableMissions: number
  readonly totalHomeNotifications: number
}
