import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('بريد غير صالح'),
  password: z.string().min(6, 'كلمة المرور قصيرة'),
});

export const productSchema = z.object({
  nameAr: z.string().min(2),
  categoryId: z.string().min(1),
  estimatedPrice: z.coerce.number().min(0),
  minimumWidth: z.coerce.number().positive(),
  maximumWidth: z.coerce.number().positive(),
  minimumHeight: z.coerce.number().positive(),
  maximumHeight: z.coerce.number().positive(),
});

export const orderPriceSchema = z.object({
  price: z.coerce.number().min(0),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
