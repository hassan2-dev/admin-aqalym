'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { DataTable, Td } from '@/presentation/components/shared/data-table';
import { EmptyState } from '@/presentation/components/shared/empty-state';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { MoneyInput } from '@/presentation/components/ui/money-input';
import { Label } from '@/presentation/components/ui/label';
import { Textarea } from '@/presentation/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/ui/dialog';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { formatCurrency } from '@/shared/lib/utils';

export type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'money' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
};

export function CrudPage<T extends { id: string }>({
  title,
  description,
  headers,
  columns,
  fields,
  items,
  loading,
  error,
  onRetry,
  onSave,
  onDelete,
  mapItemToForm,
  emptyTitle,
}: {
  title: string;
  description?: string;
  headers: string[];
  columns: (item: T) => React.ReactNode[];
  fields: FieldDef[];
  items?: T[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onSave: (values: Record<string, string>, editing?: T) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
  mapItemToForm: (item: T) => Record<string, string>;
  emptyTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | undefined>();
  const [form, setForm] = useState<Record<string, string>>({});

  function openCreate() {
    setEditing(undefined);
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      initial[f.name] = '';
    });
    setForm(initial);
    setOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setForm(mapItemToForm(item));
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await onSave(form, editing);
      toast.success(editing ? 'تم التحديث بنجاح' : 'تم الإنشاء بنجاح');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  async function remove(item: T) {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await onDelete(item);
      toast.success('تم الحذف');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description}
        action={{ label: 'إضافة جديد', onClick: openCreate }}
      />

      {loading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : error ? (
        <ErrorState onRetry={onRetry} />
      ) : !items?.length ? (
        <EmptyState title={emptyTitle ?? 'لا توجد عناصر'} actionLabel="إضافة" onAction={openCreate} />
      ) : (
        <DataTable headers={[...headers, 'إجراءات']}>
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30">
              {columns(item).map((cell, i) => (
                <Td key={i}>{cell}</Td>
              ))}
              <Td>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => void remove(item)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل' : 'إضافة'} — {title}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            {fields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label>{field.label}</Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    required={field.required}
                    value={form[field.name] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                  />
                ) : field.type === 'select' ? (
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
                    required={field.required}
                    value={form[field.name] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                  >
                    <option value="">اختر...</option>
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'money' ? (
                  <MoneyInput
                    required={field.required}
                    value={form[field.name] ?? ''}
                    onValueChange={(digits) => setForm((f) => ({ ...f, [field.name]: digits }))}
                  />
                ) : (
                  <Input
                    type={field.type ?? 'text'}
                    required={field.required}
                    value={form[field.name] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                  />
                )}
              </div>
            ))}
            <Button type="submit" className="w-full" variant="accent">
              حفظ
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function money(n: number) {
  return formatCurrency(n);
}
