import { expect, test } from '@playwright/test';

test.describe('public marketing surfaces', () => {
  test('landing, signup, and login expose the new cheque-first story', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Cheques tokenizados, tasa clara y flujos realmente navegables.' })).toBeVisible();
    await expect(page.getByText('Riesgo crediticio con IA + BCRA', { exact: true })).toBeVisible();
    await expect(page.getByText('precio maximo por token: ars 100.000', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear cuenta demo' })).toBeVisible();

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Elegi tu rol y entra a una demo donde el cheque ya vive con riesgo, tasa y tokenizacion.' })).toBeVisible();
    await expect(page.getByText('Cedente · PyME que sube cheques', { exact: true })).toBeVisible();
    await expect(page.getByText('analisis de riesgo con ia + bcra', { exact: true })).toBeVisible();

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Volve al flujo correcto y segui donde dejaste cada cheque.' })).toBeVisible();
    await expect(page.getByText('tokenizando cheque', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });
});
