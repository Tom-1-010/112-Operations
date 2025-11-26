import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface ChipProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'selected' | 'shortcut';
  color?: string;
  onRemove?: () => void;
}

export function Chip({ 
  className, 
  variant = 'default', 
  color, 
  onRemove, 
  children, 
  ...props 
}: ChipProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
        {
          'bg-dark-700 text-gray-300 border border-dark-600 hover:bg-dark-600': variant === 'default',
          'bg-primary-600 text-white border border-primary-500': variant === 'selected',
          'bg-orange-600 text-white border border-orange-500': variant === 'shortcut',
        },
        color && `bg-${color} text-white`,
        className
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 rounded-full p-0.5 hover:bg-black/20"
          type="button"
        >
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}

