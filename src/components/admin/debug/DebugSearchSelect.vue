<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface Option {
  id: string
  name: string
  icon?: string
}

const props = defineProps<{
  label: string
  modelValue: string
  options: Option[]
  tooltipTitle: string
  tooltipDesc: string
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'select', option: Option): void
}>()

const search = ref('')
const showDropdown = ref(false)
const selectRef = ref<HTMLElement | null>(null)

// Sync parent value to search text initially
watch(() => props.modelValue, (newVal) => {
  const matching = props.options.find(o => o.id === newVal)
  search.value = matching ? matching.name.toUpperCase() : newVal.toUpperCase()
}, { immediate: true })

const filteredOptions = computed(() => {
  const s = search.value.toLowerCase()
  return props.options.filter(o => o.id.includes(s) || o.name.toLowerCase().includes(s)).slice(0, 50)
})

function handleSelect(option: Option) {
  search.value = option.name.toUpperCase()
  showDropdown.value = false
  emit('update:modelValue', option.id)
  emit('select', option)
}

function handleClickOutside(e: MouseEvent) {
  if (selectRef.value && !selectRef.value.contains(e.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  window.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div 
    ref="selectRef"
    class="debug-input-group search-select-container"
  >
    <div
      class="label-row"
      style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
    >
      <label>{{ label }}</label>
      <slot name="label-action" />
    </div>
    <PVTooltip
      :title="tooltipTitle"
      :description="tooltipDesc"
    >
      <input 
        v-model="search" 
        type="text" 
        :placeholder="placeholder || 'BUSCAR...'"
        class="search-input"
        @focus="showDropdown = true"
      >
    </PVTooltip>
    <div
      v-if="showDropdown"
      class="options-dropdown custom-scrollbar"
    >
      <div 
        v-for="o in filteredOptions" 
        :key="o.id" 
        class="option-item"
        :class="{ active: modelValue === o.id }"
        @click.stop="handleSelect(o)"
      >
        <img
          v-if="o.icon"
          :src="o.icon"
          class="item-icon"
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
        >
        {{ o.name.toUpperCase() }}
      </div>
    </div>
  </div>
</template>
