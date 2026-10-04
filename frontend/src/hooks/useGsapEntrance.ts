import { useEffect } from 'react';
import { entrance } from '../animations/gsap';

export function useGsapEntrance(selector = '.gs-in', deps: unknown[] = []) {
  useEffect(() => {
    entrance(selector);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}


