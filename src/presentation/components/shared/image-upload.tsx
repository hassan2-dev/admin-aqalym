'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/presentation/components/ui/button';
import { dataService } from '@/infrastructure/repositories/data-service';

export function ImageUpload({
  value,
  onChange,
  folder = 'uploads',
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await dataService.uploadFile(file, folder);
      onChange(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل رفع الصورة');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-input bg-muted/40"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'جاري الرفع...' : value ? 'تغيير الصورة' : 'اختر صورة'}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
            <X className="h-3.5 w-3.5" /> إزالة
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">تُرفع الصورة إلى Cloudflare R2</p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  );
}
