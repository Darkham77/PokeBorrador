import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useBadStore = defineStore('badStore', () => {
  const counter = ref(0);
  const data = ref<string[]>([]);

  // Trigger: reactive-timer-uncleaned (setTimeout / setInterval unmanaged)
  setInterval(() => {
    counter.value++;
  }, 1000);

  // Trigger: pinia-invalid-setter-prefix (must start with set, update, assign)
  function changeCounterDirectly(val: number) {
    counter.value = val;
  }

  // Trigger: impure-computed-side-effect
  const computedWithSideEffect = computed(() => {
    data.value.push(`side_effect_${counter.value}`);
    return counter.value * 2;
  });

  return {
    counter,
    data,
    changeCounterDirectly,
    computedWithSideEffect
  };
});
