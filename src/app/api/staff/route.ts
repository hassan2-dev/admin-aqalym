import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/infrastructure/firebase/admin';
import type { StaffUser } from '@/domain/entities';
import type { RoleSlug, StaffStatus } from '@/domain/enums';
import { DEFAULT_ROLE_PERMISSIONS } from '@/shared/constants/permissions';

export const runtime = 'nodejs';

type StaffBody = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  roleId?: string;
  status?: StaffStatus;
  password?: string;
};

function authError(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  if (code === 'auth/email-already-exists') return 'هذا الإيميل مستخدم بحساب ثاني';
  if (code === 'auth/invalid-email') return 'الإيميل غير صحيح';
  if (code === 'auth/invalid-password' || code === 'auth/weak-password') {
    return 'كلمة المرور لازم تكون 6 أحرف على الأقل';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'فشل حفظ المستخدم';
}

async function requireManager(req: NextRequest) {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'لازم تكون مسجّل دخول' }, { status: 401 });
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const snap = await getAdminDb().collection('staff').doc(decoded.uid).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'حسابك مو مرتبط بموظف' }, { status: 403 });
    }
    const staff = { id: snap.id, ...snap.data() } as StaffUser;
    if (staff.status !== 'active') {
      return NextResponse.json({ error: 'حسابك غير نشط' }, { status: 403 });
    }
    const perms = DEFAULT_ROLE_PERMISSIONS[staff.roleSlug] ?? [];
    if (!perms.includes('users.manage')) {
      return NextResponse.json({ error: 'ما عندك صلاحية إدارة المستخدمين' }, { status: 403 });
    }
    return { uid: decoded.uid };
  } catch {
    return NextResponse.json({ error: 'جلسة الدخول انتهت، ادخل مرة ثانية' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  const caller = await requireManager(req);
  if (caller instanceof NextResponse) return caller;

  try {
    const body = (await req.json()) as StaffBody;
    const name = body.name?.trim() ?? '';
    const email = body.email?.trim().toLowerCase() ?? '';
    const password = body.password?.trim() ?? '';
    const roleId = body.roleId?.trim() ?? '';
    const status: StaffStatus = body.status || 'active';
    const phone = body.phone?.trim() || '';

    if (!name || !email || !roleId) {
      return NextResponse.json({ error: 'الاسم والإيميل والدور مطلوبة' }, { status: 400 });
    }
    if (password && password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور لازم تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    const db = getAdminDb();
    const auth = getAdminAuth();
    const roleSnap = await db.collection('roles').doc(roleId).get();
    if (!roleSnap.exists) {
      return NextResponse.json({ error: 'الدور غير موجود' }, { status: 400 });
    }
    const roleSlug = (roleSnap.data()?.slug as RoleSlug) || 'sales';
    const now = new Date().toISOString();

    if (!body.id) {
      if (!password) {
        return NextResponse.json({ error: 'اكتب كلمة المرور حتى يقدر الموظف يدخل' }, { status: 400 });
      }
      const created = await auth.createUser({
        email,
        password,
        displayName: name,
        disabled: status !== 'active',
      });
      const staff: StaffUser = {
        id: created.uid,
        email,
        name,
        phone,
        roleId,
        roleSlug,
        status,
        createdAt: now,
        updatedAt: now,
      };
      await db.collection('staff').doc(created.uid).set(staff);
      return NextResponse.json({ staff });
    }

    const existingSnap = await db.collection('staff').doc(body.id).get();
    if (!existingSnap.exists) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }
    const existing = existingSnap.data() as StaffUser;

    let uid = body.id;
    try {
      await auth.getUser(uid);
    } catch {
      if (!password) {
        return NextResponse.json(
          { error: 'هذا الحساب بدون رمز دخول. اكتب كلمة مرور حتى ينشأ حسابه' },
          { status: 400 },
        );
      }
      const created = await auth.createUser({
        email,
        password,
        displayName: name,
        disabled: status !== 'active',
      });
      uid = created.uid;
    }

    if (uid === body.id) {
      await auth.updateUser(uid, {
        email,
        displayName: name,
        disabled: status !== 'active',
        ...(password ? { password } : {}),
      });
    }

    const staff: StaffUser = {
      ...existing,
      id: uid,
      email,
      name,
      phone,
      roleId,
      roleSlug,
      status,
      updatedAt: now,
    };
    await db.collection('staff').doc(uid).set(staff, { merge: true });
    if (uid !== body.id) await db.collection('staff').doc(body.id).delete();
    return NextResponse.json({ staff });
  } catch (err) {
    return NextResponse.json({ error: authError(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const caller = await requireManager(req);
  if (caller instanceof NextResponse) return caller;

  const id = new URL(req.url).searchParams.get('id')?.trim() ?? '';
  if (!id) return NextResponse.json({ error: 'معرّف المستخدم ناقص' }, { status: 400 });
  if (id === caller.uid) {
    return NextResponse.json({ error: 'ما تكدر تحذف حسابك وأنت داخل بيه' }, { status: 400 });
  }

  const db = getAdminDb();
  const auth = getAdminAuth();
  try {
    await auth.deleteUser(id);
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code !== 'auth/user-not-found') {
      return NextResponse.json({ error: authError(err) }, { status: 400 });
    }
  }
  await db.collection('staff').doc(id).delete();
  return NextResponse.json({ ok: true });
}
