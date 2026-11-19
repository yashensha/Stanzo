import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

/** Small heading for a group inside a tool panel (e.g. "Perfect rhymes"). */
export function SectionLabel({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-xs font-semibold text-ink-muted select-none', className)} {...props}>
      {children}
    </h3>
  );
}

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Shows hover affordance for chips that react to clicks. */
  interactive?: boolean;
  tone?: 'default' | 'accent';
}

/** Word/phrase pill used in rhyme, swap and dictionary results. */
export function Chip({ interactive = false, tone = 'default', className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 text-sm rounded-full border transition-colors',
        tone === 'accent'
          ? 'bg-terracotta-light border-transparent text-terracotta font-medium'
          : 'bg-paper border-paper-darker text-ink',
        interactive && 'cursor-pointer hover:border-terracotta hover:text-terracotta',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  children?: ReactNode;
  className?: string;
}

/** Centered hint shown when a panel has nothing to display yet. */
export function EmptyState({ icon, title, children, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center px-4 py-10 select-none', className)}>
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-paper-active text-ink-muted flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      {title && <p className="text-sm font-medium text-ink mb-1">{title}</p>}
      {children && <p className="text-xs text-ink-muted leading-relaxed max-w-[220px]">{children}</p>}
    </div>
  );
}
