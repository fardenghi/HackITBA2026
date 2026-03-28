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

const cleanup: Array<{ userId: string; invoiceNumber: string }> = [];

test.afterEach(async () => {
  const admin = createAdminClient();

  while (cleanup.length) {
    const item = cleanup.pop();
    if (!item) continue;

    const { data: invoices } = await admin.from('invoices').select('id').eq('invoice_number', item.invoiceNumber);
    const invoiceIds = invoices?.map((invoice) => invoice.id) ?? [];

    if (invoiceIds.length) {
      await admin.from('events').delete().in('entity_id', invoiceIds);
      await admin.from('fractions').delete().in('invoice_id', invoiceIds);
      await admin.from('invoices').delete().in('id', invoiceIds);
    }

    await admin.auth.admin.deleteUser(item.userId);
  }
});

test('cedente can originate and tokenize an invoice into funding', async ({ page }) => {
  test.setTimeout(60_000);
  const admin = createAdminClient();
  const email = `karai.invoice+${randomUUID()}@gmail.com`;
  const password = 'password123';
  const invoiceNumber = `FAC-${randomUUID()}`;

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'cedente',
      display_name: 'María Cedente',
      company_name: 'Acme SA',
    },
  });

  expect(userError).toBeNull();
  cleanup.push({ userId: userData.user!.id, invoiceNumber });

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/cedente\/dashboard$/);

  await page.goto('/cedente/invoices/new');
  await page.getByLabel('Número de cheque').fill(invoiceNumber);
  await page.getByLabel('Descripción').fill('Cheque originado desde Playwright para validar el happy path completo.');
  await page.getByRole('button', { name: 'Originar cheque' }).click();

  await expect(page).toHaveURL(/\/cedente\/invoices\/[^/]+$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: invoiceNumber })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Tier A', { exact: true })).toBeVisible();
  await expect(page.getByText('14.5%', { exact: true })).toBeVisible();
  await expect(page.getByText('Tokenización')).toBeVisible();
  await expect(page.getByText('Funding', { exact: true })).toBeVisible();

  const { data: invoice, error: invoiceError } = await admin
    .from('invoices')
    .select('status, token_hash, total_fractions')
    .eq('invoice_number', invoiceNumber)
    .single();

  expect(invoiceError).toBeNull();
  expect(invoice).toMatchObject({
    status: 'funding',
    total_fractions: 8,
  });
  expect(invoice?.token_hash).toMatch(/^[a-f0-9]{64}$/i);
});
