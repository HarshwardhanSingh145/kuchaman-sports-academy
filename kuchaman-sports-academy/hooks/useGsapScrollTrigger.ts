'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function useGsapScrollTrigger(
  containerRef: React.RefObject<HTMLElement | null>,
  dependencies: unknown[] = []
) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const element = containerRef.current;
    if (!element) return;

    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const textElements = element.querySelectorAll<HTMLElement>(
        '.gsap-reveal-text, .gsap-reveal-heading, .gsap-reveal-badge, .gsap-reveal-sub, .gsap-reveal-btn, .gsap-reveal-metric, .gsap-reveal-card'
      );

      if (!textElements || textElements.length === 0) return;

      textElements.forEach((el, index) => {
        // Compute subtle stagger delay based on sequence
        const staggerDelay = (index % 5) * 0.07;

        // Set initial state: faded out, shifted downwards slightly, subtle optical blur
        gsap.set(el, {
          opacity: 0,
          y: 26,
          filter: 'blur(8px)',
          willChange: 'transform, opacity, filter',
        });

        // Trigger on every viewport entry (downwards and upwards)
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          end: 'bottom 12%',
          // onEnter: scrolling down into view
          onEnter: () => {
            gsap.to(el, {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 0.95,
              ease: 'power3.out',
              delay: staggerDelay,
              overwrite: 'auto',
            });
          },
          // onEnterBack: scrolling up into view
          onEnterBack: () => {
            gsap.to(el, {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 0.95,
              ease: 'power3.out',
              delay: staggerDelay,
              overwrite: 'auto',
            });
          },
          // onLeave: scrolling down past the element
          onLeave: () => {
            gsap.to(el, {
              opacity: 0,
              y: -22,
              filter: 'blur(6px)',
              duration: 0.55,
              ease: 'power2.in',
              overwrite: 'auto',
            });
          },
          // onLeaveBack: scrolling up above the element
          onLeaveBack: () => {
            gsap.to(el, {
              opacity: 0,
              y: 26,
              filter: 'blur(8px)',
              duration: 0.55,
              ease: 'power2.in',
              overwrite: 'auto',
            });
          },
        });
      });
    }, element);

    // Refresh ScrollTrigger calculations after initial DOM paint
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, ...dependencies]);
}

