'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { useAuth } from '@/presentation/providers/auth-provider';
import { ar } from '@/presentation/i18n/ar';
import { BRAND } from '@/shared/constants/brand';
import { isDemoMode } from '@/infrastructure/firebase/client';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(isDemoMode ? 'admin@aqalym.iq' : '');
  const [password, setPassword] = useState(isDemoMode ? 'Admin@123' : '');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('تم تسجيل الدخول بنجاح');
      router.replace('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 20% 20%, ${BRAND.accent}33, transparent 40%), radial-gradient(circle at 80% 0%, ${BRAND.primary}22, transparent 35%), linear-gradient(160deg, #F7F8FA, #EEF1F7)`,
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold" style={{ color: BRAND.primary }}>
              {BRAND.nameAr}
            </CardTitle>
            <CardDescription className="text-base">{ar.adminPanel}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">{ar.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{ar.password}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? ar.loading : ar.signIn}
              </Button>
            </form>
            {isDemoMode ? (
              <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                {ar.demoHint}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
