<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { gsap } from 'gsap';
import { useLivePvPStore } from '@/stores/livePvP';
import { useSocialStore } from '@/stores/social/social';
import { useGameStore } from '@/stores/game';
import { useAudioStore } from '@/stores/audio';
import { logger } from '@/logic/utils/logger';
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue';

const TOAST_ENTER_Y_OFFSET = -30;
const TOAST_ANIM_DURATION_SEC = 0.4;
const PVP_TOAST_EASE_OVERSHOOT = 1.3;

const livePvPStore = useLivePvPStore();
const socialStore = useSocialStore();
const gameStore = useGameStore();
const audioStore = useAudioStore();

interface ChallengerInfo {
  id: string;
  username: string;
  level: number;
  playerClass?: string;
  avatar_style?: string;
  nick_style?: string;
  gender?: string;
}

const challenger = ref<ChallengerInfo | null>(null);

const activeInvite = computed(() => livePvPStore.activeInvite);

async function resolveChallenger(senderId: string) {
  const friend = socialStore.friends.find((f) => f.id === senderId);
  if (friend) {
    challenger.value = {
      id: friend.id,
      username: friend.username,
      level: friend.level,
      playerClass: friend.playerClass,
      avatar_style: friend.avatar_style,
      nick_style: friend.nick_style,
      gender: friend.gender
    };
    return;
  }

  if (gameStore.db) {
    try {
      const { data } = (await gameStore.db
        .from('profiles')
        .select('id, username, level, player_class, nick_style, avatar_style, gender')
        .eq('id', senderId)
        .single()) as {
        data: {
          id: string;
          username: string;
          level: number;
          player_class?: string;
          nick_style?: string;
          avatar_style?: string;
          gender?: string;
        } | null;
      };

      if (data) {
        challenger.value = {
          id: data.id,
          username: data.username,
          level: data.level || 1,
          playerClass: data.player_class,
          avatar_style: data.avatar_style,
          nick_style: data.nick_style,
          gender: data.gender
        };
        return;
      }
    } catch (err) {
      logger.warn('[PvPChallengeToast] Error resolviendo perfil del retador:', err);
    }
  }

  challenger.value = {
    id: senderId,
    username: 'Entrenador Rival',
    level: 1
  };
}

watch(
  () => activeInvite.value,
  (inv) => {
    if (inv) {
      const senderId = inv.sender_id || inv.challenger_id || '';
      if (senderId) {
        resolveChallenger(senderId);
      }
      audioStore.play('pvpChallenge');
    } else {
      challenger.value = null;
    }
  },
  { immediate: true }
);

const formatLabel = computed(() => {
  const fmt = activeInvite.value?.config?.format;
  return fmt === '6v6' ? '6v6' : '3v3';
});

const levelRuleLabel = computed(() => {
  const rule = activeInvite.value?.config?.levelRule;
  return rule === 'flat50' ? 'Nivel 50' : 'Nivel Real';
});

function onEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, y: TOAST_ENTER_Y_OFFSET, scale: 0.9 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: TOAST_ANIM_DURATION_SEC,
      ease: `back.out(${PVP_TOAST_EASE_OVERSHOOT})`,
      onComplete: done
    }
  );
}

function onLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    y: TOAST_ENTER_Y_OFFSET,
    scale: 0.85,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: done
  });
}

async function handleAccept() {
  if (!activeInvite.value) return;
  await livePvPStore.acceptInvite(activeInvite.value.id);
}

async function handleDecline() {
  if (!activeInvite.value) return;
  await livePvPStore.declineInvite(activeInvite.value.id);
}
</script>

<template>
  <Teleport to="body">
    <Transition :css="false" @enter="onEnter" @leave="onLeave">
      <div v-if="activeInvite" id="pvp-challenge-toast" class="pvp-toast-card">
        <div class="toast-glow-border" />
        <div class="toast-content">
          <div class="toast-avatar-col">
            <TrainerAvatar
              :size="48"
              :player-class="challenger?.playerClass"
              :level="challenger?.level || 1"
              :avatar-style="challenger?.avatar_style"
              :gender="challenger?.gender"
            />
          </div>

          <div class="toast-info-col">
            <div class="toast-header-line">
              <span class="swords-emoji">⚔️</span>
              <span class="toast-title">¡DESAFÍO PVP!</span>
            </div>
            <div v-gsap-nick="challenger?.nick_style || 'normal'" class="challenger-name">
              {{ challenger?.username || 'Rival' }}
            </div>
            <div class="challenge-meta">
              <span class="meta-pill format">{{ formatLabel }}</span>
              <span class="meta-pill rule">{{ levelRuleLabel }}</span>
              <span class="meta-arena"><span class="emoji">🏛️</span> Gimnasio</span>
            </div>
          </div>

          <div class="toast-actions-col">
            <button
              id="btn-accept-pvp-toast"
              v-gsap-hover="'button'"
              class="action-btn accept"
              @click="handleAccept"
            >
              ACEPTAR
            </button>
            <button
              id="btn-decline-pvp-toast"
              v-gsap-hover="'button'"
              class="action-btn decline"
              @click="handleDecline"
            >
              RECHAZAR
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.pvp-toast-card {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: var(--z-critical);
  width: 360px;
  padding: 12px;
  border: 1px solid Rgb(245 158 11 / 50%);
  border-radius: $radius-xl;
  background: Rgb(10 14 26 / 96%);
  box-shadow: var(--shadow-xl);
  backdrop-filter: Blur(8px);
  overflow: hidden;
  user-select: none;
}

.toast-glow-border {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: Linear-Gradient(90deg, var(--amber-dark), var(--red-light), var(--amber-dark));
}

.toast-content {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.toast-avatar-col {
  flex-shrink: 0;
}

.toast-info-col {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs-alt;
  min-width: 0;
  flex: 1;
}

.toast-header-line {
  display: flex;
  align-items: center;
  gap: $spacing-xs;

  .swords-emoji {
    font-size: var(--font-12);
  }

  .toast-title {
    color: var(--amber-dark);
    font-family: var(--font-pixel);
    font-size: var(--font-8);
    letter-spacing: 0.5px;
  }
}

.challenger-name {
  color: var(--slate-50);
  font-family: var(--font-pixel);
  font-size: var(--font-11);
  line-height: 1.45;
  padding-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.challenge-meta {
  display: flex;
  align-items: center;
  gap: $spacing-sm-alt;
  margin-top: 2px;
}

.meta-pill {
  padding: 2px 5px;
  border-radius: $radius-sm;
  font-family: var(--font-pixel);
  font-size: var(--font-7);

  &.format {
    border: 1px solid Rgb(56 189 248 / 30%);
    background: Rgb(56 189 248 / 20%);
    color: var(--sky);
  }

  &.rule {
    border: 1px solid Rgb(168 85 247 / 30%);
    background: Rgb(168 85 247 / 20%);
    color: var(--purple-400);
  }
}

.meta-arena {
  color: var(--slate-400);
  font-family: var(--font-pixel);
  font-size: var(--font-7);
}

.toast-actions-col {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;
  flex-shrink: 0;
}

.action-btn {
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: $radius-md;
  font-family: var(--font-pixel);
  font-size: var(--font-8);
  cursor: pointer;
  letter-spacing: 0.5px;

  &.accept {
    background: var(--emerald);
    color: var(--white);
    border-color: var(--emerald);
  }

  &.decline {
    background: Rgb(239 68 68 / 20%);
    color: var(--red-300);
    border-color: Rgb(239 68 68 / 40%);

    &:hover {
      background: Rgb(239 68 68 / 40%);
    }
  }
}
</style>
