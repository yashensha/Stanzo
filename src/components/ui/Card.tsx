import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover lift for clickable cards (e.g. project tiles). */
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-paper-darker bg-paper-dark shadow-paper-sm',
        interactive && 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-paper-md hover:border-ink-light',
        className,
      )}
      {...props}
    />
  );
});
