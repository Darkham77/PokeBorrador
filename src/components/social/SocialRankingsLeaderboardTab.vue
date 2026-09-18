<script setup lang="ts">
import { useSocialStore } from '@/stores/social/social'
import { useModalStore } from '@/stores/modals'
import SocialRankingsLeaderboardRow from '@/components/social/SocialRankingsLeaderboardRow.vue'
import type { LeaderboardEntry } from '@/stores/social/social'

defineProps<{
  currentPlayerUid: string
}>()

const socialStore = useSocialStore()
const modalStore = useModalStore()

function handleChallengePlayer(player: LeaderboardEntry) {
  modalStore.open('PvPChallenge', {
    opponentId: player.id,
    opponentName: player.username,
    friend: {
      id: player.id,
      username: player.username,
      isOnline: player.isOnline,
      avatar: player.avatar_style || 'trainer_red',
      elo: player.elo
    }
  })
}
</script>

<template>
  <div class="tab-pane leaderboard-pane">
    <div
      v-if="socialStore.leaderboardLoading"
      class="loader"
    >
      <div
        v-gsap-loop="'spin'"
        class="spinner"
      />
      <p>Consultando el Salón Global...</p>
    </div>

    <div
      v-else-if="socialStore.leaderboard.length === 0"
      class="empty-state"
    >
      No hay datos disponibles en el Salón Global aún.
    </div>

    <div
      v-else
      class="leaderboard-list"
    >
      <SocialRankingsLeaderboardRow
        v-for="(player, index) in socialStore.leaderboard"
        :key="player.id"
        :player="player"
        :index="index"
        :current-player-uid="currentPlayerUid"
        @challenge="handleChallengePlayer"
      />
    </div>
  </div>
</template>

<style scoped src="./SocialRankings.styles.scss" lang="scss"></style>
