/**
 * Svelte action: drag an element left past `threshold` of its width to call `onSwipe`.
 * Vertical scrolling keeps working (`touch-action: pan-y`); a short or mostly vertical drag
 * springs back. Buttons inside stay the accessible way to do the same thing.
 */
export function swipeToRemove(
  node: HTMLElement,
  options: { onSwipe: () => void; threshold?: number }
) {
  let settings = options;
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let pointerId: number | null = null;
  let horizontal = false;

  node.style.touchAction = 'pan-y';

  function reset() {
    node.style.transition = 'transform 160ms ease, opacity 160ms ease';
    node.style.transform = '';
    node.style.opacity = '';
    pointerId = null;
    horizontal = false;
    dx = 0;
  }

  function onDown(event: PointerEvent) {
    if (
      event.pointerType === 'mouse' ||
      (event.target as HTMLElement).closest('button, a, select')
    ) {
      return;
    }
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    node.style.transition = 'none';
  }

  function onMove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    const moveX = event.clientX - startX;
    const moveY = event.clientY - startY;
    if (!horizontal) {
      if (Math.abs(moveY) > 10 && Math.abs(moveY) > Math.abs(moveX)) return reset();
      if (Math.abs(moveX) < 10) return;
      horizontal = true;
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic or already released pointer: dragging still works without capture.
      }
    }
    dx = Math.min(0, moveX);
    node.style.transform = `translateX(${dx}px)`;
    node.style.opacity = String(1 + dx / node.offsetWidth);
  }

  function onUp(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    const passed = horizontal && -dx > node.offsetWidth * (settings.threshold ?? 0.4);
    if (passed) {
      node.style.transition = 'transform 160ms ease, opacity 160ms ease';
      node.style.transform = 'translateX(-100%)';
      node.style.opacity = '0';
      setTimeout(() => settings.onSwipe(), 160);
      pointerId = null;
    } else {
      reset();
    }
  }

  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', reset);

  return {
    update(next: typeof options) {
      settings = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', reset);
    }
  };
}
