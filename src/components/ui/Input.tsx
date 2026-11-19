import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-paper-darker bg-paper px-3 text-sm text-ink',
        'placeholder:text-ink-light transition-colors',
        'focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/30',
        className,
      )}
      {...props}
    />
  );
});
