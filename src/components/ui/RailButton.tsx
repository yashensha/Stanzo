import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface RailButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /** Which edge the active indicator sits on. */
  side?: 'left' | 'right';
  label: string;
}

/** Icon button for the workspace activity rails. Shows an accent bar + tint when active. */
export const RailButton = forwardRef<HTMLButtonElement, RailButtonProps>(function RailButton(
  { active = false, side = 'left', label, className, title, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={title ?? label}
      className={cn(
        'relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-150 cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-terracotta',
        active
          ? 'bg-terracotta-light text-terracotta'
          : 'text-ink-muted hover:text-ink hover:bg-paper-active',
        className,
      )}
      {...props}
    >
      {active && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-2 bottom-2 w-[3px] rounded-full bg-terracotta',
            side === 'left' ? '-left-2' : '-right-2',
          )}
        />
      )}
      {children}
    </button>
  );
});
