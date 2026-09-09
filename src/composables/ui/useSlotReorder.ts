import { ref, type Ref } from 'vue';

export interface UseSlotReorderReturn {
  activeSwapIndex: Ref<number | null>;
  draggedSlotIndex: Ref<number | null>;
  swapSlots: (fromIndex: number, toIndex: number) => boolean;
  selectSlotForSwap: (index: number) => void;
  replaceSlot: (slotIndex: number, newUid: string) => boolean;
  handleDragStart: (index: number, event?: DragEvent) => void;
  handleDragOver: (event?: DragEvent) => void;
  handleDrop: (targetIndex: number, event?: DragEvent) => boolean;
  handleDragEnd: () => void;
}

/**
 * Composable to manage team slot reordering, Tap-to-Swap lifecycle,
 * and drag-and-drop interactions while preventing empty slots or duplications.
 */
export function useSlotReorder(slots: Ref<string[]>): UseSlotReorderReturn {
  const activeSwapIndex = ref<number | null>(null);
  const draggedSlotIndex = ref<number | null>(null);

  function isValidIndex(idx: number): boolean {
    return Number.isInteger(idx) && idx >= 0 && idx < slots.value.length;
  }

  function swapSlots(fromIndex: number, toIndex: number): boolean {
    if (!isValidIndex(fromIndex) || !isValidIndex(toIndex)) {
      return false;
    }
    if (fromIndex === toIndex) {
      return true;
    }

    const next = [...slots.value];
    const itemFrom = next[fromIndex];
    const itemTo = next[toIndex];
    if (itemFrom === undefined || itemTo === undefined) {
      return false;
    }

    next[fromIndex] = itemTo;
    next[toIndex] = itemFrom;
    slots.value = next;
    return true;
  }

  function selectSlotForSwap(index: number): void {
    if (!isValidIndex(index)) return;

    if (activeSwapIndex.value === null) {
      activeSwapIndex.value = index;
    } else if (activeSwapIndex.value === index) {
      // Cancel if clicked again
      activeSwapIndex.value = null;
    } else {
      // Swap with previously selected slot
      swapSlots(activeSwapIndex.value, index);
      activeSwapIndex.value = null;
    }
  }

  function replaceSlot(slotIndex: number, newUid: string): boolean {
    if (!isValidIndex(slotIndex) || !newUid) {
      return false;
    }

    const next = [...slots.value];
    const existingIndex = next.indexOf(newUid);

    if (existingIndex !== -1) {
      if (existingIndex !== slotIndex) {
        // Swap positions to avoid duplication
        const temp = next[slotIndex];
        const existingItem = next[existingIndex];
        if (temp === undefined || existingItem === undefined) {
          return false;
        }
        next[slotIndex] = existingItem;
        next[existingIndex] = temp;
      }
    } else {
      next[slotIndex] = newUid;
    }

    slots.value = next;
    return true;
  }

  function handleDragStart(index: number, event?: DragEvent): void {
    if (!isValidIndex(index)) return;
    draggedSlotIndex.value = index;
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  function handleDragOver(event?: DragEvent): void {
    if (event) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  }

  function handleDrop(targetIndex: number, event?: DragEvent): boolean {
    if (event) {
      event.preventDefault();
    }
    const fromIndex = draggedSlotIndex.value;
    draggedSlotIndex.value = null;

    if (fromIndex !== null && isValidIndex(fromIndex) && isValidIndex(targetIndex)) {
      return swapSlots(fromIndex, targetIndex);
    }
    return false;
  }

  function handleDragEnd(): void {
    draggedSlotIndex.value = null;
  }

  return {
    activeSwapIndex,
    draggedSlotIndex,
    swapSlots,
    selectSlotForSwap,
    replaceSlot,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd
  };
}
