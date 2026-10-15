interface LampMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

/** Placeholder brand mark: a lamp flame inside a soft rounded shape (PRD §8, open question). */
export function LampMark({ size = 24, className, title }: LampMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16 6.5c3.6 4.1 6 7.4 6 11a6 6 0 0 1-12 0c0-2.3 1-4.2 2.6-5.9.2 1.9 1 3.1 2.2 3.6-.5-3.2.2-5.9 1.2-8.7Z"
        fill="currentColor"
      />
      <path d="M11 25.5h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
