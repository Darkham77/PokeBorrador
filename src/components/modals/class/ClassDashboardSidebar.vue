<script setup lang="ts">
import { gsap } from 'gsap'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { PlayerClassDefinition } from '@/data/player/playerClasses'
import type { GenderId } from '@/types/system/game'

defineProps<{
  currentClass?: PlayerClassDefinition | null
  currentGender: GenderId
  canChangeGender: boolean
  daysUntilIdentityChange: number
  trainerLevel: number
  classLevel: number
  trainerMaleSprite: string
  trainerFemaleSprite: string
}>()

const emit = defineEmits<{
  (e: 'select-gender', gender: GenderId): void
}>()

const GSAP_TRAINER_CARD_HOVER_SCALE_BOOST = 1.05

const onTrainerMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    scale: GSAP_TRAINER_CARD_HOVER_SCALE_BOOST,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onTrainerMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    scale: 1,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onRankCardMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    x: 5,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onRankCardMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    x: 0,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const handleImageError = (e: Event) => {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}
</script>

<template>
  <aside
    id="class-dashboard-sidebar"
    class="dashboard-sidebar custom-scrollbar-vicio"
  >
    <div class="avatar-box">
      <div class="avatar-glow" />
      <div class="trainers-wrap">
        <PVTooltip :title="currentGender === 'h' ? '♂️ Masculino (Género Actual)' : (!canChangeGender ? `♂️ Masculino (Cooldown: Faltan ${daysUntilIdentityChange} días)` : '♂️ Masculino (Haz clic para cambiar)')">
          <img
            id="btn-trainer-gender-male"
            :src="trainerMaleSprite"
            alt="Entrenador Masculino"
            class="trainer-big-img"
            :class="{ active: currentGender === 'h', inactive: currentGender === 'm', locked: currentGender !== 'h' && !canChangeGender }"
            @click.stop="emit('select-gender', 'h')"
            @mouseenter="onTrainerMouseEnter"
            @mouseleave="onTrainerMouseLeave"
            @error="handleImageError"
          >
        </PVTooltip>
        <PVTooltip :title="currentGender === 'm' ? '♀️ Femenino (Género Actual)' : (!canChangeGender ? `♀️ Femenino (Cooldown: Faltan ${daysUntilIdentityChange} días)` : '♀️ Femenino (Haz clic para cambiar)')">
          <img
            id="btn-trainer-gender-female"
            :src="trainerFemaleSprite"
            alt="Entrenadora Femenina"
            class="trainer-big-img"
            :class="{ active: currentGender === 'm', inactive: currentGender === 'h', locked: currentGender !== 'm' && !canChangeGender }"
            @click.stop="emit('select-gender', 'm')"
            @mouseenter="onTrainerMouseEnter"
            @mouseleave="onTrainerMouseLeave"
            @error="handleImageError"
          >
        </PVTooltip>
      </div>
    </div>

    <h1 class="class-main-title">
      {{ currentClass?.name.toUpperCase() }}
    </h1>
    <p class="class-slogan">
      "{{ currentClass?.description }}"
    </p>

    <div class="rank-cards">
      <div
        id="rank-card-trainer-level"
        class="rank-card level"
        @mouseenter="onRankCardMouseEnter"
        @mouseleave="onRankCardMouseLeave"
      >
        <div class="card-icon emoji">
          🎖️
        </div>
        <div class="card-text">
          <span class="label">NIVEL CUENTA</span>
          <span class="value">Nv. {{ trainerLevel }}</span>
        </div>
      </div>

      <div
        id="rank-card-class-level"
        class="rank-card level"
        @mouseenter="onRankCardMouseEnter"
        @mouseleave="onRankCardMouseLeave"
      >
        <div class="card-icon emoji">
          🎓
        </div>
        <div class="card-text">
          <span class="label">NIVEL CLASE</span>
          <span
            class="value"
            :style="{ color: currentClass?.color || 'var(--yellow)' }"
          >Nv. {{ classLevel }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style src="./ClassDashboard.styles.scss" scoped lang="scss"></style>
