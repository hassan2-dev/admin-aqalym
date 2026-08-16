'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { ProductSpec } from '@/domain/entities';
import { SPEC_SUGGESTIONS } from '@/shared/constants/spec-suggestions';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';

const emptySpec = (): ProductSpec => ({ label: '', value: '' });

export function SpecEditor({
  specs,
  onChange,
  title = 'المواصفات',
}: {
  specs: ProductSpec[];
  onChange: (next: ProductSpec[]) => void;
  title?: string;
}) {
  const rows = specs.length ? specs : [emptySpec()];

  function update(index: number, patch: Partial<ProductSpec>) {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  }

  function exampleFor(label: string) {
    return SPEC_SUGGESTIONS.find((s) => s.label === label)?.example;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label>{title}</Label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            اكتب الخاصية وقيمتها بجملة واضحة — مثل: نظام الألمنيوم = كسر حراري ٧٠ مم
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...rows, emptySpec()])}
        >
          <Plus className="h-3.5 w-3.5" /> إضافة خاصية
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SPEC_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] hover:bg-muted"
            onClick={() => {
              if (rows.some((r) => r.label === s.label)) return;
              const blank = rows.findIndex((r) => !r.label.trim() && !r.value.trim());
              if (blank >= 0) {
                update(blank, { label: s.label });
              } else {
                onChange([...rows, { label: s.label, value: '' }]);
              }
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {rows.map((s, i) => {
        const example = exampleFor(s.label);
        return (
          <div key={i} className="rounded-xl border border-border bg-muted/15 p-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">اسم الخاصية</p>
                <Input
                  placeholder="مثال: نظام الألمنيوم"
                  value={s.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
              </div>
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">القيمة</p>
                <Input
                  placeholder={example ? `مثال: ${example}` : 'مثال: كسر حراري ٧٠ مم'}
                  value={s.value}
                  onChange={(e) => update(i, { value: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={rows.length <= 1}
                  onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {s.label.trim() && s.value.trim() ? (
              <p className="text-xs text-muted-foreground">
                سيظهر للعميل: <strong className="text-foreground">{s.label}</strong> — {s.value}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
