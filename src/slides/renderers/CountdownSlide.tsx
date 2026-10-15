import { useEffect, useState } from 'react';
import { formatClock } from '../clock';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

export function CountdownSlide({ slide, countdownEndsAt }: RenderProps<'countdown'>) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!countdownEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [countdownEndsAt]);
  const remaining = countdownEndsAt ? countdownEndsAt - now : slide.minutes * 60_000;
  return (
    <div className={`${s.content} ${s.center} ${s['stack']}`}>
      {slide.label && <p className={s.eyebrow}>{slide.label}</p>}
      <p className={s.countdown} aria-live="off">
        {formatClock(remaining)}
      </p>
    </div>
  );
}
