<script setup lang="ts">
/**
 * src/components/profile/ProfileBadgesCard.vue
 * 
 * Gym badge showcase shelf for trainer profile modal.
 */

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService.ts';
import type { GymId } from '@/data/world/gyms.ts';

const GYM_BADGES = [
  { id: 'pewter', name: 'Roca' },
  { id: 'cerulean', name: 'Cascada' },
  { id: 'vermilion', name: 'Trueno' },
  { id: 'celadon', name: 'Arcoíris' },
  { id: 'fuchsia', name: 'Alma' },
  { id: 'saffron', name: 'Marsh' },
  { id: 'cinnabar', name: 'Volcán' },
  { id: 'viridian', name: 'Tierra' }
] as const satisfies readonly { id: GymId; name: string }[];

defineProps<{
  badgesCount: number;
  isGymDefeated: (gymId: GymId) => boolean;
}>();
</script>

<template>
  <div class="profile-section-card badges-card">
    <div class="section-label">
      MEDALLAS DE KANTO ({{ badgesCount }}/8)
    </div>
    <div class="badges-shelf">
      <div 
        v-for="badge in GYM_BADGES" 
        :key="badge.id"
        class="badge-item"
        :title="badge.name"
      >
        <img 
          :src="getAssetUrl(ASSET_TYPES.BADGE, badge.id)" 
          :alt="badge.name"
          class="badge-img"
          :class="{ 'locked-badge': !isGymDefeated(badge.id) }"
        >
        <span class="badge-title">{{ badge.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/variables' as *;

.profile-section-card {
  background: Rgba(30, 41, 59, 0.4);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .section-label {
    @include pixelated;
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.4);
    letter-spacing: 0.5px;
  }
}

.badges-shelf {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  background: linear-gradient(180deg, Rgba(82, 53, 31, 0.8) 0%, Rgba(56, 36, 21, 0.9) 100%);
  border: 2px solid #3d2412;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 
    inset 0 4px 8px Rgba(0, 0, 0, 0.6),
    0 4px 10px Rgba(0, 0, 0, 0.4);
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.badge-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  @include pixelated;
  filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.4));

  &.locked-badge {
    filter: Grayscale(100%) Brightness(0.5);
    opacity: 0.25;
  }
}

.badge-title {
  @include pixelated;
  font-size: 6px;
  color: Rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}
</style>
