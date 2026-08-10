import { NextRequest, NextResponse } from 'next/server';
import { isR2Configured, uploadToR2 } from '@/infrastructure/storage/r2';
import { generateId } from '@/shared/lib/utils';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = /^image\//;

export async function POST(req: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        {
          error:
            'Cloudflare R2 غير مضبوط. عبّي R2_ACCOUNT_ID و R2_ACCESS_KEY_ID و R2_SECRET_ACCESS_KEY و R2_BUCKET_NAME و R2_PUBLIC_URL في .env.local',
        },
        { status: 503 }
      );
    }

    const form = await req.formData();
    const file = form.get('file');
    const folderRaw = form.get('folder');
    const folder =
      typeof folderRaw === 'string' && folderRaw.trim()
        ? folderRaw.trim().replace(/[^a-zA-Z0-9/_-]/g, '')
        : 'uploads';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 });
    }
    if (!ALLOWED.test(file.type || '')) {
      return NextResponse.json({ error: 'يُسمح برفع الصور فقط' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'حجم الملف أكبر من 10MB' }, { status: 400 });
    }

    const safeName = file.name.replace(/[^\w.\-ء-ي]+/g, '_').slice(0, 80);
    const key = `${folder}/${generateId('file')}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2({
      key,
      body: buffer,
      contentType: file.type || 'application/octet-stream',
    });

    return NextResponse.json({ url, key });
  } catch (e) {
    console.error('[R2 upload]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'فشل الرفع إلى R2' },
      { status: 500 }
    );
  }
}
