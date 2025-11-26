import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-dark-700 text-gray-300': variant === 'default',
          'bg-green-600 text-white': variant === 'success',
          'bg-yellow-600 text-white': variant === 'warning',
          'bg-red-600 text-white': variant === 'error',
          'bg-blue-600 text-white': variant === 'info',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

