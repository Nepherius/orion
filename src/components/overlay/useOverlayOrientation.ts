import { useEffect, useRef, useState } from 'react';

export function useOverlayOrientation(activeSessionId?: string) {
  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  const [isVerticalOverlay, setIsVerticalOverlay] = useState(false);

  useEffect(() => {
    const overlayRoot = overlayRootRef.current;
    if (!overlayRoot) {
      return;
    }

    let animationFrameId: number | undefined;

    const updateOverlayOrientation = () => {
      const { width, height } = overlayRoot.getBoundingClientRect();
      if (width <= 0 || height <= 0) {
        return;
      }

      setIsVerticalOverlay((wasVertical) => {
        const hasVerticalRoom = height >= 220;
        const shouldBeVertical = hasVerticalRoom && height > width * 1.15;
        const shouldStayVertical = hasVerticalRoom && height > width * 1.02;
        const nextIsVertical = wasVertical ? shouldStayVertical : shouldBeVertical;

        return nextIsVertical === wasVertical ? wasVertical : nextIsVertical;
      });
    };

    const scheduleUpdate = () => {
      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = window.requestAnimationFrame(updateOverlayOrientation);
    };

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(overlayRoot);
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();

    return () => {
      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(animationFrameId);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [activeSessionId]);

  return { overlayRootRef, isVerticalOverlay };
}
