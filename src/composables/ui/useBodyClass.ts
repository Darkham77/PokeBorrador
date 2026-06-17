import { watch, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'

/**
 * useBodyClass
 * Reactively manages a class on the document.body.
 * Ensures the class is removed when the component is unmounted.
 */
export function useBodyClass(className: string, isEnabled: MaybeRefOrGetter<boolean>) {
  const updateClass = (val: boolean) => {
    if (val) {
      document.body.classList.add(className)
    } else {
      document.body.classList.remove(className)
    }
  }

  // Support both Ref and Getter function
  watch(
    () => toValue(isEnabled),
    (val) => {
      updateClass(val)
    },
    { immediate: true }
  )

  onUnmounted(() => {
    document.body.classList.remove(className)
  })
}
