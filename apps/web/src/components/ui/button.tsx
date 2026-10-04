import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white',
        className,
      )}
      {...props}
    />
  );
}
