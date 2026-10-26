import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLibraryStore = defineStore('library', () => {
  const isOpen = ref(false);
  const currentTab = ref('gimnasios');

  function open(tab = 'gimnasios'): void {
    currentTab.value = tab;
    isOpen.value = true;
  }

  function close(): void {
    isOpen.value = false;
  }

  function switchTab(tab: string): void {
    currentTab.value = tab;
  }

  return {
    isOpen,
    currentTab,
    open,
    close,
    switchTab
  };
});
