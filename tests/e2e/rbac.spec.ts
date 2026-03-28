import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials for Playwright cleanup.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const createdUserIds: string[] = [];

test.afterEach(async () => {
  const admin = createAdminClient();

  while (createdUserIds.length) {
    const userId = createdUserIds.pop();
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
});

async function trackUser(email: string) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const userId = data.users.find((user) => user.email === email)?.id;
  if (userId) createdUserIds.push(userId);
}

test.describe('rbac flow', () => {
  test('redirects anonymous users away from protected dashboards', async ({ page }) => {
    await page.goto('/cedente/dashboard');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/inversor/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('redirects wrong-role users back to their own dashboard', async ({ page }) => {
    const email = `rbac.${randomUUID()}@gmail.com`;
    const password = 'password123';

    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Nombre visible').fill('Cedente RBAC');
    await page.getByLabel('Empresa (opcional)').fill('RBAC SA');
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page).toHaveURL(/\/cedente\/dashboard$/);
    await trackUser(email);

    await page.goto('/inversor/dashboard');
    await expect(page).toHaveURL(/\/cedente\/dashboard$/);

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
