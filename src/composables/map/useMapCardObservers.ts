import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { MOBILE_SCREEN_BREAKPOINT_PX } from '@/logic/constants/gameplay';

const WIDE_CARD_BREAKPOINT_PX = 350;
const MEDIUM_CARD_BREAKPOINT_PX = 200;

export function useMapCardObservers(cardRef: Ref<HTMLElement | null>, windowWidth: Ref<number>) {
  const currentCols = ref(3);
  const isVisible = ref(false);

  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;

  onMounted(() => {
    if (cardRef.value) {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const width = entry.contentRect.width;
        if (width > WIDE_CARD_BREAKPOINT_PX) currentCols.value = 4;
        else if (width > MEDIUM_CARD_BREAKPOINT_PX) currentCols.value = 3;
        else currentCols.value = 2;
      });
      resizeObserver.observe(cardRef.value);

      const isMobileDevice = windowWidth.value < MOBILE_SCREEN_BREAKPOINT_PX;
      const marginValue = isMobileDevice ? '180px' : '1200px';

      const INTERSECTION_VISIBILITY_THRESHOLD = 0.01 as const;
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) {
            isVisible.value = entry.isIntersecting;
          }
        },
        {
          rootMargin: marginValue,
          threshold: INTERSECTION_VISIBILITY_THRESHOLD
        }
      );
      intersectionObserver.observe(cardRef.value);
    }
  });

  onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if (intersectionObserver) intersectionObserver.disconnect();
  });

  return {
    currentCols,
    isVisible
  };
}
