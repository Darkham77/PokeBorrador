export function hasExceededTouchThreshold(
  deltaX: number,
  deltaY: number,
  threshold: number
): boolean {
  return Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold;
}

export function resolveDropSlotIndex(
  clientX: number,
  clientY: number,
  moveRefs: (HTMLElement | null)[],
  currentEl?: HTMLElement | null
): number | null {
  if (currentEl) currentEl.style.pointerEvents = 'none';
  const target = document.elementFromPoint(clientX, clientY);
  const slot = target?.closest('.move-slot-wrapper') as HTMLElement | null;
  if (currentEl) currentEl.style.pointerEvents = 'auto';

  if (!slot) return null;
  const targetIndex = moveRefs.indexOf(slot);
  return targetIndex !== -1 ? targetIndex : null;
}
