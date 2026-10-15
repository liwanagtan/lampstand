import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react';
import { revealBlock, revealLines } from './motion';

interface RevealProps {
  as?: ElementType;
  className?: string;
  animate: boolean;
  /** 'lines' splits text into lines; 'block' fades the element as a whole. */
  by?: 'lines' | 'block';
  delay?: number;
  children: ReactNode;
}

/** Text that reveals itself when shown live; static everywhere else. */
export function Reveal({
  as: Tag = 'div',
  className,
  animate,
  by = 'lines',
  delay = 0,
  children,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!animate || !el) return;
    return by === 'lines' ? revealLines(el, delay) : revealBlock(el, delay);
    // Reveal once per mount; content changes remount via the slide key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
