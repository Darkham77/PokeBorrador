import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLibraryStore = defineStore('library', () => {
  const isOpen = ref(false)
  const currentTab = ref('gimnasios')

  function open(tab = 'gimnasios') {
    currentTab.value = tab
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function switchTab(tab) {
    currentTab.value = tab
  }

  return {
    isOpen,
    currentTab,
    open,
    close,
    switchTab
  }
})
