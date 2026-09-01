<script setup lang="ts">
interface ActionItem {
  id: string
  icon: string
  label: string
  desc?: string
}

defineProps<{
  title: string
  items: ActionItem[]
  titleStyle?: Record<string, string | number>
  cardStyle?: Record<string, string | number>
  labelStyle?: Record<string, string | number>
  descStyle?: Record<string, string | number>
  arrowStyle?: Record<string, string | number>
}>()

defineEmits<{
  (e: 'action', id: string): void
}>()
</script>

<template>
  <div class="debug-section">
    <h3 
      class="section-title"
      :style="titleStyle"
    >
      {{ title }}
    </h3>
    <div class="button-list">
      <button
        v-for="item in items"
        :key="item.id"
        class="debug-btn-long"
        :style="cardStyle"
        @click.stop="$emit('action', item.id)"
      >
        <div class="btn-content">
          <span class="emoji icon">{{ item.icon }}</span>
          <div class="text">
            <span 
              class="label"
              :style="labelStyle"
            >{{ item.label }}</span>
            <span
              v-if="item.desc"
              class="desc"
              :style="descStyle"
            >{{ item.desc }}</span>
          </div>
        </div>
        <span 
          class="emoji arrow"
          :style="arrowStyle"
        >▶</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.debug-section {
  .section-title {
    @include pixelated;
    font-size: 8px;
    color: var(--yellow);
    margin-bottom: 12px;
    letter-spacing: 1px;
    opacity: 0.8;
  }
}

.button-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.debug-btn-long {
  width: 100%;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  color: white;
  padding: 14px 16px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  
  &:hover {
    background: Rgba(255, 255, 255, 0.08);
    transform: Translatex(4px);
  }

  .btn-content {
    display: flex;
    align-items: center;
    gap: 14px;
    
    .icon { font-size: 20px; }
    
    .text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      
      .label { @include pixelated; font-size: 8px; }
      .desc { font-size: 9px; color: Rgba(255, 255, 255, 0.4); }
    }
  }
}
</style>
