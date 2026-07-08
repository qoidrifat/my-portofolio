import React, { useState, useRef, useEffect } from 'react';

/**
 * LazySection — renders children only when the element is near the viewport.
 *
 * Uses IntersectionObserver with a configurable rootMargin so sections mount
 * before the user actually scrolls to them (invisible pre-mount).
 *
 * Props:
 *   children    — content to render once triggered
 *   id          — rendered on the wrapper so nav links can find the element
 *                 before the section content mounts
 *   threshold   — px distance from viewport to trigger mount (default 400)
 *   placeholder — element shown before trigger (default null, a stable spacer)
 *   as          — wrapper tag (default 'div')
 *   className   — class passed to the wrapper
 *   ariaHidden  — whether the placeholder should be hidden from AT
 */
export default function LazySection({
  children,
  id,
  threshold = 400,
  placeholder = null,
  as: Tag = 'div',
  className = '',
  ariaHidden = false,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip observer if reduced motion is preferred — mount everything
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // one-shot
        }
      },
      {
        rootMargin: `${threshold}px 0px`,
        threshold: 0,
      }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <Tag ref={ref} id={id} className={className} aria-hidden={ariaHidden && !isVisible ? true : undefined}>
      {isVisible ? children : placeholder}
    </Tag>
  );
}
