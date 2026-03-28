export const authRoles = ['cedente', 'inversor'] as const;

export type AuthRole = (typeof authRoles)[number];

export type SignupPayload = {
  email: string;
  password: string;
  role: AuthRole;
  displayName: string;
  companyName?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthRedirectTarget = '/cedente/dashboard' | '/inversor/dashboard';

export type SignupMetadata = {
  role: AuthRole;
  display_name: string;
  company_name?: string;
};
