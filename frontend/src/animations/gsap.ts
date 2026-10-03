import gsap from 'gsap';

export function entrance(selector: string) {
  gsap.fromTo(selector, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'power2.out', overwrite: true });
}

export function popIn(selector: string) {
  gsap.fromTo(selector, { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'power2.out', overwrite: true });
}
