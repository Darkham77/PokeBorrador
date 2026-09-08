<script setup lang="ts">
import { computed } from 'vue'
import { useHomeWidgetsCollapse, type HomeWidgetId } from '@/composables/home/useHomeWidgetsCollapse'
import { useHomeWidgetBadges } from '@/composables/home/useHomeWidgetBadges'

interface Props {
  widgetId: HomeWidgetId
  title: string
  icon: string
  badge?: number | string
  subtitle?: string
}

const props = defineProps<Props>()
const { isCollapsed, toggleCollapse } = useHomeWidgetsCollapse()
const { getWidgetBadge } = useHomeWidgetBadges()

const collapsed = computed(() => isCollapsed(props.widgetId))

const resolvedBadge = computed(() => {
  if (props.badge !== undefined && props.badge !== '') {
    return props.badge
  }
  return getWidgetBadge(props.widgetId)
})

const toggle = () => {
  toggleCollapse(props.widgetId)
}
</script>

<template>
  <!-- Collapsed State: Compact single-line bar identical to media_1788792637007.png -->
  <div
    v-if="collapsed"
    :id="`home-widget-collapsed-${widgetId}`"
    class="accordion-panel home-collapsible-panel"
  >
    <button
      :id="`home-widget-toggle-${widgetId}`"
      class="accordion-toggle"
      :aria-expanded="false"
      @click="toggle"
    >
      <span class="accordion-title-wrap">
        <span class="emoji">{{ icon }}</span>
        <span class="collapse-title">{{ title }}</span>
        <span
          v-if="resolvedBadge !== undefined && resolvedBadge !== ''"
          class="hud-notification-badge collapse-pill-badge text-outline"
          :class="{
            'green is-active': resolvedBadge === 'ACTIVA', // text-ok: UI text display localization string
            'gray is-inactive': resolvedBadge === 'INACTIVA'
          }"
        >
          {{ resolvedBadge }}
        </span>
        <span
          v-if="subtitle"
          class="collapse-sub"
        >
          · {{ subtitle }}
        </span>
      </span>
      <i class="fas toggle-arrow fa-chevron-down" />
    </button>
  </div>

  <!-- Expanded State: Full Widget -->
  <div
    v-else
    :id="`home-widget-expanded-${widgetId}`"
    class="home-collapsible-expanded"
  >
    <slot
      :is-collapsed="false"
      :toggle="toggle"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.home-collapsible-panel {
  background: Rgba(18, 22, 34, 0.6);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px Rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
  width: 100%;

  &:hover {
    border-color: Rgba(255, 255, 255, 0.16);
  }
}

.accordion-toggle {
  width: 100%;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: transparent;
  border: none;
  outline: none;
  border-radius: 8px;
  color: var(--white, #ffffff);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
  user-select: none;

  &:focus,
  &:focus-visible,
  &:active {
    outline: none;
    border: none;
    box-shadow: none;
  }

  &:hover {
    background: Rgba(255, 255, 255, 0.05);
  }

  &:active {
    background: Rgba(255, 255, 255, 0.08);
  }

  .accordion-title-wrap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    line-height: 1.35;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    .emoji {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      flex-shrink: 0;
      font-size: 14px;
    }

    .collapse-title {
      @include pixelated;
      font-size: 11px;
      letter-spacing: 0.5px;
      color: var(--white, #ffffff);
    }

    .collapse-pill-badge {
      position: static !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      @include text-outline(var(--black, #000), 1px);
      font-size: 8px !important;
      font-weight: bold !important;
      padding: 3px 6px !important;
      border-radius: 9999px !important;
      margin-left: 6px !important;
      letter-spacing: 0.5px !important;
      vertical-align: middle !important;
    }

    .collapse-sub {
      font-size: 10px;
      color: var(--gray, #94a3b8);
      font-weight: normal;
    }
  }

  &:hover {
    background: Rgba(255, 255, 255, 0.05);
  }

  .toggle-arrow {
    font-size: 9px;
    color: var(--gray, #94a3b8);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-left: 8px;
  }
}

.home-collapsible-expanded {
  width: 100%;
  box-sizing: border-box;
}
</style>
