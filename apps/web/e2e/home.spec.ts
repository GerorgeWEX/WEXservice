import { expect, test } from '@playwright/test';

test('home renders with Romanian diacritics and React island', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'WEX Service' })).toBeVisible();
  await expect(page.getByText('Fundația aplicației')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Test island React' })).toBeVisible();
});
