import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useSlotReorder } from '@/composables/ui/useSlotReorder';

describe('useSlotReorder', () => {
  it('swaps two slots correctly', () => {
    const slots = ref(['uid-1', 'uid-2', 'uid-3', 'uid-4', 'uid-5', 'uid-6']);
    const { swapSlots } = useSlotReorder(slots);

    const success = swapSlots(0, 2);
    expect(success).toBe(true);
    expect(slots.value).toEqual(['uid-3', 'uid-2', 'uid-1', 'uid-4', 'uid-5', 'uid-6']);
  });

  it('handles Tap-to-Swap selection lifecycle', () => {
    const slots = ref(['uid-1', 'uid-2', 'uid-3', 'uid-4', 'uid-5', 'uid-6']);
    const { selectSlotForSwap, activeSwapIndex } = useSlotReorder(slots);

    // Click slot 1
    selectSlotForSwap(1);
    expect(activeSwapIndex.value).toBe(1);

    // Click slot 4 -> triggers swap and resets selection
    selectSlotForSwap(4);
    expect(activeSwapIndex.value).toBe(null);
    expect(slots.value[1]).toBe('uid-5');
    expect(slots.value[4]).toBe('uid-2');
  });

  it('cancels Tap-to-Swap if same slot is clicked twice', () => {
    const slots = ref(['uid-1', 'uid-2', 'uid-3']);
    const { selectSlotForSwap, activeSwapIndex } = useSlotReorder(slots);

    selectSlotForSwap(0);
    expect(activeSwapIndex.value).toBe(0);

    selectSlotForSwap(0);
    expect(activeSwapIndex.value).toBe(null);
  });

  it('replaces a slot with a new item without creating empty slots', () => {
    const slots = ref(['uid-1', 'uid-2', 'uid-3', 'uid-4', 'uid-5', 'uid-6']);
    const { replaceSlot } = useSlotReorder(slots);

    // Replace slot 2 with 'uid-new'
    const success = replaceSlot(2, 'uid-new');
    expect(success).toBe(true);
    expect(slots.value[2]).toBe('uid-new');
    expect(slots.value.length).toBe(6);
    expect(slots.value.includes('')).toBe(false);
  });

  it('swaps if the replacement item is already in another slot (prevents duplicates)', () => {
    const slots = ref(['uid-1', 'uid-2', 'uid-3', 'uid-4', 'uid-5', 'uid-6']);
    const { replaceSlot } = useSlotReorder(slots);

    // Try to replace slot 0 with 'uid-3' which is already in slot 2
    replaceSlot(0, 'uid-3');
    expect(slots.value[0]).toBe('uid-3');
    expect(slots.value[2]).toBe('uid-1');
    expect(new Set(slots.value).size).toBe(6);
  });

  it('rejects out of bounds indices gracefully', () => {
    const slots = ref(['uid-1', 'uid-2']);
    const { swapSlots, replaceSlot } = useSlotReorder(slots);

    expect(swapSlots(-1, 1)).toBe(false);
    expect(swapSlots(0, 5)).toBe(false);
    expect(replaceSlot(10, 'new')).toBe(false);
  });
});
