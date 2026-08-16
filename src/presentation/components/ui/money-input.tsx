'use client';

import * as React from 'react';
import { Input } from '@/presentation/components/ui/input';
import { cn, formatIqdInput, parseIqdDigits } from '@/shared/lib/utils';

type MoneyInputProps = Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onValueChange: (digits: string) => void;
};

export function MoneyInput({ value, onValueChange, className, ...props }: MoneyInputProps) {
  return (
    <div className="relative">
      <Input
        {...props}
        inputMode="numeric"
        dir="ltr"
        className={cn('pr-12 text-left font-semibold tabular-nums tracking-wide', className)}
        value={formatIqdInput(value)}
        onChange={(e) => onValueChange(parseIqdDigits(e.target.value))}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        د.ع
      </span>
    </div>
  );
}
