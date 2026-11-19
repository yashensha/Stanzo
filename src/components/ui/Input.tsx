import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 'sm' (32px) for dense tool panels, 'md' (40px) default. */
  inputSize?: 'sm' | 'md';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, inputSize = 'md', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-paper-darker bg-paper px-3 text-ink',
        inputSize === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm',
        'placeholder:text-ink-light transition-colors',
        'focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/30',
        className,
      )}
      {...props}
    />
  );
});
