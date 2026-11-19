import { cn } from '../utils/cn';

export const BRAND_NAME = 'Stanza';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** Brand mark: two stacked rounded bars. */
export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 150 150"
      fill="none"
      role="img"
      aria-label={BRAND_NAME}
      className={cn('shrink-0', className)}
    >
      <path
        fill="#3ec0dd"
        d="M39.36,141.93c-8.27-14.33-12.41-21.5-10.55-28.43,1.86-6.94,8.94-11.02,23.09-19.2l60.85-35.13,4.49,7.77c6.13,10.62,9.2,15.93,7.8,21.13-1.39,5.2-6.7,8.27-17.32,14.4l-68.35,39.46Z"
      />
      <path
        fill="#3ec0dd"
        d="M34.87,81.7c-6.13-10.62-9.2-15.93-7.8-21.13,1.39-5.2,6.7-8.27,17.32-14.4L112.75,6.7l4.49,7.77c6.13,10.62,9.2,15.93,7.8,21.13-1.39,5.2-6.7,8.27-17.32,14.4L39.36,89.47l-4.49-7.77Z"
      />
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
