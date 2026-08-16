import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { StaffUser } from '@/domain/entities';
import { demoDb } from '@/infrastructure/demo/store';
import { getFirebaseAuth, getFirebaseDb, isDemoMode } from '@/infrastructure/firebase/client';

async function fetchStaffProfile(uid: string): Promise<StaffUser | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, 'staff', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as StaffUser;
}

async function waitForFirebaseUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      unsub();
      resolve(firebaseUser);
    });
  });
}

export const authService = {
  async login(email: string, password: string): Promise<StaffUser> {
    if (isDemoMode) return demoDb.login(email, password);
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth غير متاح');
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchStaffProfile(cred.user.uid);
    if (!profile) {
      await signOut(auth);
      throw new Error('لا يوجد ملف موظف مرتبط بهذا الحساب');
    }
    if (profile.status !== 'active') {
      await signOut(auth);
      throw new Error('الحساب غير نشط');
    }
    return profile;
  },

  async logout() {
    if (isDemoMode) return demoDb.logout();
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
  },

  async getCurrentUser(): Promise<StaffUser | null> {
    if (isDemoMode) return demoDb.currentUser();
    const firebaseUser = await waitForFirebaseUser();
    if (!firebaseUser) return null;
    return fetchStaffProfile(firebaseUser.uid);
  },

  onAuthChanged(callback: (user: StaffUser | null) => void) {
    if (isDemoMode) {
      void demoDb.currentUser().then(callback);
      return () => undefined;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      callback(null);
      return () => undefined;
    }
    return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }
      callback(await fetchStaffProfile(firebaseUser.uid));
    });
  },

  async createStaffAuth(email: string, password: string, profile: Omit<StaffUser, 'id'>) {
    if (isDemoMode) {
      return demoDb.saveStaff({ ...profile, email });
    }
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) throw new Error('Firebase غير متاح');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const staff: StaffUser = { ...profile, id: cred.user.uid, email };
    await setDoc(doc(db, 'staff', cred.user.uid), staff);
    return staff;
  },
};
