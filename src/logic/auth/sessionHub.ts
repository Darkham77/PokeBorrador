
import { supabase } from '../supabase'
import { gameBus } from '../gameBus'

/**
 * Session Hub - Multi-tab and Multi-device synchronization.
 * Implements "Last-In-Wins" logic for save-game locking.
 */

let sessionChannel: BroadcastChannel | null = null
const SESSION_ID = crypto.randomUUID()
let currentUserId: string | null = null
let isLocked = false

export function initSessionHub(userId: string) {
  if (typeof window === 'undefined') return
  currentUserId = userId
  console.log(`[SessionHub] Initializing for user ${userId} | Session: ${SESSION_ID}`)

  // 1. Local Synchronization (BroadcastChannel)
  if (!sessionChannel) {
    sessionChannel = new BroadcastChannel('pv_session_hub')
    sessionChannel.onmessage = (event) => {
      if (event.data.type === 'NEW_SESSION' && event.data.sessionId !== SESSION_ID) {
        console.warn('[SessionHub] Local session conflict detected!')
        triggerLock()
      }
    }
  }

  // Notify other tabs in this browser
  sessionChannel.postMessage({ type: 'NEW_SESSION', sessionId: SESSION_ID })

  // 2. Global Synchronization (Supabase)
  if (supabase.mode === 'online') {
    supabase.initSession(userId, SESSION_ID)
    
    // Listen for conflict event from DBRouter
    window.addEventListener('session-conflict', () => {
      console.warn('[SessionHub] Global session conflict detected!')
      triggerLock()
    })
  }
}

function triggerLock() {
  if (isLocked) return
  isLocked = true
  
  console.error('[SessionHub] WRITE PERMISSIONS REVOKED. Instance is now Read-Only.')
  
  // Notify UI via GameBus or Custom Event
  window.dispatchEvent(new CustomEvent('pv-save-lock'))
  gameBus.emit('SESSION_LOCKED')
}

export function getSessionId() {
  return SESSION_ID
}

export function isSaveLocked() {
  return isLocked
}

/**
 * Re-claims control of the session for the current tab.
 * Updates the database and notifies other tabs.
 */
export async function reclaimControl() {
  if (!currentUserId) return
  
  isLocked = false
  console.log('[SessionHub] Reclaiming control of the session...');
  
  const { supabase } = await import('../supabase')
  if (supabase.mode === 'online') {
    await supabase.initSession(currentUserId, SESSION_ID)
  }
  
  if (sessionChannel) {
    sessionChannel.postMessage({ type: 'NEW_SESSION', sessionId: SESSION_ID })
  }
  
  // Notify UI
  window.dispatchEvent(new CustomEvent('pv-save-unlock'))
}
