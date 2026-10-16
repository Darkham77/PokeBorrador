/**
 * src/stores/social/chatSanitizer.ts
 *
 * Chat map sanitization and session-mode filtering.
 */

import { logger } from '@/logic/utils/logger';
import type { ChatMessage } from '@/stores/social/chatPrivate';

export interface PrivateChat {
  username: string;
  messages: ChatMessage[];
  unreadCount: number;
  isCollapsed: boolean;
  lastInteraction: number;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PrivateChatMap = Record<string, PrivateChat>; // open-record: User ID to private chat mapping

export function sanitizePrivateChats(
  chats: PrivateChatMap | undefined,
  currentChats: PrivateChatMap,
  userId: string | undefined,
  sessionMode: string,
  forceCollapse = false,
  isInitialized = true
): PrivateChatMap {
  const sanitized: PrivateChatMap = {};
  if (!chats) return sanitized;

  for (const [id, chat] of Object.entries(chats)) {
    if (userId && id === userId) continue;

    const isLocalKey = id === 'local_user' || id === 'eq.local_user' || id.startsWith('local_');
    if (sessionMode === 'online' && isLocalKey) {
      logger.info('Chat', `Filtrando chat local contaminado en modo online: ${id}`);
      continue;
    }

    if (sessionMode === 'offline' && UUID_REGEX.test(id)) {
      logger.info('Chat', `Filtrando chat remoto en modo offline: ${id}`);
      continue;
    }

    const currentCollapsed =
      isInitialized && currentChats[id] ? currentChats[id].isCollapsed : true;

    sanitized[id] = {
      ...chat,
      isCollapsed: forceCollapse ? true : currentCollapsed
    };
  }

  return sanitized;
}
