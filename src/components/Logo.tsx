import { cn } from '../utils/cn';

export const BRAND_NAME = 'Stanza';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** Placeholder mark: a squircle with three "stanza" lines and a note-head dot. Swap for the final logo later. */
export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label={BRAND_NAME}
      className={cn('shrink-0', className)}
    >
      <rect width="32" height="32" rx="9" fill="var(--color-terracotta)" />
      <path d="M8 11h16M8 16h9M8 21h16" stroke="var(--color-paper)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="22.5" cy="16" r="2.4" fill="var(--color-paper)" />
    </svg>
  );
}

interface LogoProps extends LogoMarkProps {
  showWordmark?: boolean;
}

export function Logo({ size = 28, showWordmark = true, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className="font-semibold tracking-tight"
          style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: size * 0.85 }}
        >
          {BRAND_NAME}
        </span>
      )}
    </span>
  );
}
