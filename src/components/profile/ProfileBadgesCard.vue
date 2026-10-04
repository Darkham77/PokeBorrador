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
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 8px;
  background: Rgb(30 41 59 / 40%);

  .section-label {
    @include pixelated;

    color: Rgb(255 255 255 / 40%);
    font-size: 8px;
    letter-spacing: 0.5px;
  }
}

.badges-shelf {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, 1fr);
  padding: 16px;
  border: 2px solid #3d2412;
  border-radius: 12px;
  background: Linear-Gradient(180deg, Rgb(82 53 31 / 80%) 0%, Rgb(56 36 21 / 90%) 100%);
  box-shadow: 
    inset 0 4px 8px Rgb(0 0 0 / 60%),
    0 4px 10px Rgb(0 0 0 / 40%);
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.badge-img {
  @include pixelated;

  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: Drop-Shadow(0 2px 4px Rgb(0 0 0 / 40%));

  &.locked-badge {
    opacity: 0.25;
    filter: Grayscale(100%) Brightness(0.5);
  }
}

.badge-title {
  @include pixelated;

  color: Rgb(255 255 255 / 50%);
  font-size: 6px;
  text-transform: uppercase;
}
</style>
