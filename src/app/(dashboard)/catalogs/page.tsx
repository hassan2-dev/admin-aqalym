'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { EmptyState } from '@/presentation/components/shared/empty-state';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Textarea } from '@/presentation/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/ui/dialog';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useCatalogs, useCrudMutation, useProducts } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import type { ProductSpec, SpecCatalog } from '@/domain/entities';
import { useAuth } from '@/presentation/providers/auth-provider';
import { cn } from '@/shared/lib/utils';

const emptySpec = (): ProductSpec => ({ label: '', value: '' });

export default function CatalogsPage() {
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useCatalogs();
  const products = useProducts();
  const save = useCrudMutation(['catalogs'], (args: Parameters<typeof dataService.saveCatalog>[0]) =>
    dataService.saveCatalog(args)
  );
  const remove = useCrudMutation(['catalogs'], (id: string) => dataService.deleteCatalog(id));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SpecCatalog | undefined>();
  const [nameAr, setNameAr] = useState('');
  const [name, setName] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [specs, setSpecs] = useState<ProductSpec[]>([emptySpec()]);

  const selected = useMemo(
    () => data?.find((c) => c.id === selectedId) ?? data?.[0],
    [data, selectedId]
  );

  const linkedCount = useMemo(() => {
    if (!selected) return 0;
    return (products.data ?? []).filter((p) => p.catalogId === selected.id).length;
  }, [products.data, selected]);

  function openCreate() {
    setEditing(undefined);
    setNameAr('');
    setName('');
    setDescriptionAr('');
    setSpecs([emptySpec()]);
    setOpen(true);
  }

  function openEdit(c: SpecCatalog) {
    setEditing(c);
    setNameAr(c.nameAr);
    setName(c.name);
    setDescriptionAr(c.descriptionAr);
    setSpecs(c.specifications.length ? c.specifications.map((s) => ({ ...s })) : [emptySpec()]);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = specs.filter((s) => s.label.trim() && s.value.trim());
    if (!cleaned.length) {
      toast.error('أضف مواصفة قياسية واحدة على الأقل');
      return;
    }
    try {
      const saved = await save.mutateAsync({
        id: editing?.id,
        nameAr,
        name: name || nameAr,
        descriptionAr,
        description: descriptionAr,
        specifications: cleaned,
      });
      setSelectedId(saved.id);
      toast.success(editing ? 'تم تحديث الكتالوج' : 'تم إنشاء الكتالوج');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="كتالوجات المواصفات"
        description="قوالب مواصفات قياسية مشتركة — المنتج يختار الكتالوج ويرث الميزات دون تعديل القالب"
        actions={
          can('catalogs.manage') ? (
            <Button variant="accent" onClick={openCreate}>
              <Plus className="h-4 w-4" /> كتالوج جديد
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <SectionCard title="الكتالوجات">
          {!data?.length ? (
            <EmptyState title="لا توجد كتالوجات" actionLabel="إضافة" onAction={openCreate} />
          ) : (
            <div className="space-y-2">
              {data.map((c) => {
                const active = selected?.id === c.id;
                const count = (products.data ?? []).filter((p) => p.catalogId === c.id).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-3 text-right transition',
                      active ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'border-border hover:bg-muted/40'
                    )}
                  >
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{c.nameAr}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.specifications.length} مواصفة · {count} منتج
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        {selected ? (
          <SectionCard
            title={selected.nameAr}
            action={
              can('catalogs.manage') ? (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(selected)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      void remove
                        .mutateAsync(selected.id)
                        .then(() => {
                          toast.success('تم الحذف');
                          setSelectedId(null);
                        })
                        .catch((err: unknown) =>
                          toast.error(err instanceof Error ? err.message : 'فشل الحذف')
                        );
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : null
            }
          >
            <p className="mb-4 text-sm text-muted-foreground">
              {selected.descriptionAr || 'بدون وصف'} · مرتبط بـ {linkedCount} منتج
            </p>
            <div className="space-y-2">
              {selected.specifications.map((s, i) => (
                <div
                  key={`${s.label}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3"
                >
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-sm text-muted-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل كتالوج' : 'كتالوج مواصفات جديد'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            <div>
              <Label>الاسم بالعربي</Label>
              <Input className="mt-1" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
            </div>
            <div>
              <Label>الاسم بالإنجليزي</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                className="mt-1"
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>المواصفات القياسية</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSpecs((prev) => [...prev, emptySpec()])}
                >
                  <Plus className="h-3.5 w-3.5" /> إضافة
                </Button>
              </div>
              {specs.map((s, i) => (
                <div key={i} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    placeholder="الحقل (مثل: نظام الألمنيوم)"
                    value={s.label}
                    onChange={(e) =>
                      setSpecs((prev) =>
                        prev.map((row, idx) => (idx === i ? { ...row, label: e.target.value } : row))
                      )
                    }
                  />
                  <Input
                    placeholder="القيمة القياسية"
                    value={s.value}
                    onChange={(e) =>
                      setSpecs((prev) =>
                        prev.map((row, idx) => (idx === i ? { ...row, value: e.target.value } : row))
                      )
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={specs.length <= 1}
                    onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="submit" className="w-full" variant="accent">
              حفظ الكتالوج
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
