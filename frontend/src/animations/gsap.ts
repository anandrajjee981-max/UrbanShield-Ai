import gsap from 'gsap';

function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function entrance(selector: string) {
  if (reducedMotion()) {
    gsap.set(selector, { y: 0, opacity: 1 });
    return;
  }
  gsap.fromTo(selector, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'power2.out', overwrite: true });
}

export function popIn(selector: string) {
  if (reducedMotion()) {
    gsap.set(selector, { scale: 1, opacity: 1 });
    return;
  }
  gsap.fromTo(selector, { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'power2.out', overwrite: true });
}
