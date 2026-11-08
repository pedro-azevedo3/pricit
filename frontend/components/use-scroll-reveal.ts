'use client';

import { useEffect, type RefObject } from 'react';

const entrances: Record<string, Keyframe> = {
  up: { opacity: 0, translate: '0 48px' },
  left: { opacity: 0, translate: '-64px 0' },
  right: { opacity: 0, translate: '64px 0' },
  zoom: { opacity: 0, scale: '.88', translate: '0 24px' },
  tilt: { opacity: 0, rotate: '-7deg', translate: '0 40px', scale: '.94' },
  soft: { opacity: 0, translate: '0 18px' },
};

// Paused animations track scroll position in both directions, without timers or React renders.
export function useScrollReveal(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dispose = () => {};
    const setup = () => {
      dispose();
      if (media.matches || !root.current || !Element.prototype.animate) return;
      const items = Array.from(root.current.querySelectorAll<HTMLElement>('[data-reveal]')).map(element => {
        const animation = element.animate([
          entrances[element.dataset.reveal || 'up'] || entrances.up,
          { opacity: 1, translate: '0 0', scale: '1', rotate: '0deg' },
        ], { duration: 1000, fill: 'both', easing: 'cubic-bezier(.2,.65,.3,1)' });
        animation.pause();
        return { element, animation, top: 0, height: 0, stagger: Number(element.dataset.revealOffset || 0) };
      });
      let frame = 0;
      let measure = true;
      const update = () => {
        frame = 0;
        if (measure) {
          for (const item of items) {
            // Layout coordinates exclude the animated translate/scale/rotation.
            let top = 0;
            let node: HTMLElement | null = item.element;
            while (node) { top += node.offsetTop; node = node.offsetParent as HTMLElement | null; }
            item.top = top;
            item.height = item.element.offsetHeight;
          }
          measure = false;
        }
        const viewport = window.innerHeight;
        for (const {element, animation, top, height, stagger} of items) {
          const position = top - window.scrollY;
          const enterDistance = Math.max(80, Math.min(viewport * .3, height * .8));
          const leaveDistance = Math.max(60, Math.min(viewport * .2, height * .65));
          const entering = (viewport - position - stagger) / enterDistance;
          const leaving = (position + height) / leaveDistance;
          const progress = element.contains(document.activeElement) ? 1 : Math.max(0, Math.min(1, entering, leaving));
          animation.currentTime = progress * 1000;
        }
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
      const resize = () => { measure = true; schedule(); };
      const observer = new ResizeObserver(resize);
      observer.observe(root.current);
      items.forEach(({element}) => observer.observe(element));
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', resize);
      root.current.addEventListener('focusin', schedule);
      root.current.addEventListener('focusout', schedule);
      const container = root.current;
      update();
      dispose = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', resize);
        container.removeEventListener('focusin', schedule);
        container.removeEventListener('focusout', schedule);
        items.forEach(({animation}) => animation.cancel());
      };
    };
    setup();
    media.addEventListener('change', setup);
    return () => { dispose(); media.removeEventListener('change', setup); };
  }, [root]);
}
