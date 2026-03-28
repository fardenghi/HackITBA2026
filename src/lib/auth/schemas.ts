import { z } from 'zod';
import { authRoles } from '@/lib/auth/types';

export const authRoleSchema = z.enum(authRoles);

export const signupSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  role: authRoleSchema,
  displayName: z.string().trim().min(2, 'Ingresá tu nombre o alias.'),
  companyName: z.string().trim().max(120).optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

export function buildSignupMetadata(input: z.infer<typeof signupSchema>) {
  return {
    role: input.role,
    display_name: input.displayName,
    company_name: input.companyName?.trim() || undefined,
  };
}

export type SignupSchema = z.infer<typeof signupSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
