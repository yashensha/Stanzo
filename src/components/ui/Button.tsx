import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-terracotta text-paper hover:bg-terracotta-hover',
  secondary: 'bg-paper-dark text-ink border border-paper-darker hover:bg-paper-active',
  ghost: 'bg-transparent text-ink-muted hover:bg-paper-active hover:text-ink',
  danger: 'bg-transparent text-red-600 dark:text-red-400 border border-red-500/40 hover:bg-red-500/10',
};

const sizes: Record<ButtonSize, string> = {
  // Compact by default (mouse/laptop); touch (coarse pointer) gets 44px-class targets.
  sm: 'h-7 px-2.5 text-xs gap-1.5 pointer-coarse:h-10 pointer-coarse:px-3',
  md: 'h-8 px-3.5 text-[13px] gap-2 pointer-coarse:h-11 pointer-coarse:px-4 pointer-coarse:text-sm',
  lg: 'h-10 px-5 text-sm gap-2 pointer-coarse:h-12 pointer-coarse:px-6 pointer-coarse:text-base',
  icon: 'h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11 p-0 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
