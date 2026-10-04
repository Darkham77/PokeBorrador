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
  width: 100%;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 8px;
  background: rgb(18 22 34 / 60%);
  overflow: hidden;
  box-shadow: 0 2px 8px rgb(0 0 0 / 25%);
  box-sizing: border-box;

  &:hover {
    border-color: rgb(255 255 255 / 16%);
  }
}

.accordion-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--white, #fff);
  font-size: 11px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
  user-select: none;

  &:focus,
  &:focus-visible {
    border: none;
    outline: none;
    box-shadow: none;
  }

  &:hover {
    background: rgb(255 255 255 / 5%);
  }

  &:active {
    border: none;
    background: rgb(255 255 255 / 8%);
    outline: none;
    box-shadow: none;
  }

  .accordion-title-wrap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    line-height: 1.45;
    text-align: left;
    padding-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    .emoji {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      font-size: 14px;
      line-height: 1;
      flex-shrink: 0;
    }

    .collapse-title {
      @include pixelated;

      color: var(--white, #fff);
      font-size: 11px;
      letter-spacing: 0.5px;
    }

    .collapse-pill-badge {
      @include text-outline(var(--black, #000), 1px);

      position: static !important;
      display: inline-flex !important;
      justify-content: center !important;
      align-items: center !important;
      padding: 3px 6px !important;
      border-radius: 9999px !important;
      font-size: 8px !important;
      font-weight: bold !important;
      margin-left: 6px !important;
      letter-spacing: 0.5px !important;
      vertical-align: middle !important;
    }

    .collapse-sub {
      color: var(--gray, #94a3b8);
      font-size: 10px;
      font-weight: normal;
    }
  }

  .toggle-arrow {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    color: var(--gray, #94a3b8);
    font-size: 9px;
    flex-shrink: 0;
    margin-left: 8px;
  }
}

.home-collapsible-expanded {
  width: 100%;
  box-sizing: border-box;
}
</style>
