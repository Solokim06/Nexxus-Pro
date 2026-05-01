import { useState, useEffect, useRef } from 'react';

export const useIntersectionObserver = (options = {}) => {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    triggerOnce = false,
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If triggerOnce and already triggered, don't observe
    if (triggerOnce && hasTriggered) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);
        
        if (triggerOnce && intersecting && !hasTriggered) {
          setHasTriggered(true);
          observer.unobserve(element);
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, root, rootMargin, triggerOnce, hasTriggered]);

  return { ref, isIntersecting, hasTriggered };
};

// For infinite scrolling
export const useInfiniteScroll = (callback, hasMore, loading) => {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: false,
  });

  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      callback();
    }
  }, [isIntersecting, hasMore, loading, callback]);

  return ref;
};

export default useIntersectionObserver;