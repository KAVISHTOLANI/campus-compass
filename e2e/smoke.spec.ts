import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('search, filter, open a place, favourite it', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 2, 3, 13, 15)); // Tuesday 13:15
  await page.goto('./');
  await page.getByLabel('Search the demo campus').fill('library');
  await page.waitForTimeout(1000);
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');

  await page.getByRole('link', { name: 'Search the directory' }).first().click();
  await page.getByLabel('Search', { exact: true }).fill('gp');
  await expect(page.getByTestId('result-count')).toHaveText('1 result');
  await page.getByLabel('Search', { exact: true }).fill('');
  await page.getByLabel(/^Health/).check();
  await page.getByLabel('Open now only').check();
  await expect(page.getByTestId('result-count')).toHaveText('2 results');
  await page.evaluate(() => window.scrollTo(0, 0));
  await snap(page, 'directory');
  await checkMobile(page);
  await page.getByRole('link', { name: 'Student Health Centre' }).click();
  await expect(page.getByText('Open until 17:30').first()).toBeVisible();
  await page.getByRole('button', { name: '☆ Save to favourites' }).click();
  await page.reload();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Favourites' }).click();
  await expect(page.getByRole('link', { name: 'Student Health Centre' })).toBeVisible();
});
