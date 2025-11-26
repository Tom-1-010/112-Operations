import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface SliderProps extends Omit<HTMLAttributes<HTMLInputElement>, 'type'> {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (value: number) => void;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 1, max = 5, step = 1, value, onChange, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className={cn(
            'h-2 w-full cursor-pointer appearance-none rounded-lg bg-dark-700 outline-none',
            'slider-thumb:appearance-none slider-thumb:h-5 slider-thumb:w-5 slider-thumb:cursor-pointer slider-thumb:rounded-full slider-thumb:bg-primary-600 slider-thumb:shadow-lg',
            'slider-track:appearance-none slider-track:h-2 slider-track:rounded-lg slider-track:bg-dark-700',
            className
          )}
          ref={ref}
          {...props}
        />
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          {Array.from({ length: max - min + 1 }, (_, i) => (
            <span key={i + min}>{i + min}</span>
          ))}
        </div>
      </div>
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };





































