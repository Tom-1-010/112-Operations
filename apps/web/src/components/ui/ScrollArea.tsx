import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ScrollArea({ className, children, ...props }: ScrollAreaProps) {
  return (
    <div
      className={cn(
        'overflow-auto scrollbar-thin',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}







































