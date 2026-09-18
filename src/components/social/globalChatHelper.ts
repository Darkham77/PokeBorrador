import { BATTLE_CODE_REGEX } from '@/logic/constants/gameplay'
import { formatChatTimestamp } from '@/logic/utils/timeUtils'
import type { ChatMessage } from '@/stores/social/chatPrivate'
import type { ProfileCacheItem } from '@/stores/social/chatCosmetics'

export const GLOBAL_CHAT_MIN_LEVEL = 10 as const
export const GLOBAL_CHAT_MAX_CHARS = 100 as const

const DEFAULT_PLAYER_CLASS = 'entrenador' as const
const DEFAULT_GENDER = 'h' as const
const DEFAULT_NICK_STYLE = 'normal' as const
const DEFAULT_USERNAME = 'Entrenador' as const
const DEFAULT_TRAINER_LEVEL = 1 as const

export interface ChatMessageVisuals {
  readonly playerClass: string
  readonly level: number
  readonly avatarStyle?: string
  readonly gender: string
  readonly nickStyle: string
  readonly username: string
  readonly time: string
  readonly battleCode: string | null
  readonly messageText: string
}

export function extractBattleCode(message?: string): string | null {
  if (!message) return null
  const match = message.match(BATTLE_CODE_REGEX)
  return match ? match[0].toUpperCase() : null
}

export function canTrainerParticipateInGlobalChat(trainerLevel?: number): boolean {
  return (trainerLevel ?? DEFAULT_TRAINER_LEVEL) >= GLOBAL_CHAT_MIN_LEVEL
}

export function resolveChatMessageVisuals(
  msg: ChatMessage,
  cosmetics?: ProfileCacheItem | null
): ChatMessageVisuals {
  const playerClass = cosmetics?.player_class || msg.player_class || DEFAULT_PLAYER_CLASS
  const level = cosmetics?.trainer_level || msg.trainer_level || DEFAULT_TRAINER_LEVEL
  const avatarStyle = cosmetics?.avatar_style || undefined
  const gender = cosmetics?.gender || msg.gender || DEFAULT_GENDER
  const username = cosmetics?.username || msg.username || msg.senderName || DEFAULT_USERNAME
  const nickStyle = cosmetics?.nick_style || DEFAULT_NICK_STYLE
  const time = formatChatTimestamp(msg.created_at || msg.timestamp)
  const messageText = msg.message || msg.text || ''
  const battleCode = extractBattleCode(messageText)

  return {
    playerClass,
    level,
    avatarStyle,
    gender,
    nickStyle,
    username,
    time,
    battleCode,
    messageText
  }
}
