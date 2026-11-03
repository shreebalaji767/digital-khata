const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('loads the dashboard without browser errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Receivables')).toBeVisible();
  await expect(page.getByText('Quick actions')).toBeVisible();
  expect(errors).toEqual([]);
});

test('all workspace sections open', async ({ page, isMobile }) => {
  const sections = [
    ['Khata Ledger', 'Add account'],
    ['Customers', 'Add customer'],
    ['Suppliers', 'Add supplier'],
    ['Payments', 'Payment history'],
    ['Invoices & Sales', 'Sales invoices'],
    ['Inventory', 'Inventory'],
    ['Expenses', 'Business expenses'],
    ['Reminders', 'Reminder list'],
    ['Reports', 'Udhaar recorded'],
    ['Settings & Backup', 'Business profile']
  ];

  for (const [navName, expectedText] of sections) {
    if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('[data-page]').filter({ hasText: navName }).click();
    await expect(page.locator('#view')).toContainText(expectedText);
  }
});

test('customer and ledger entries persist after reload', async ({ page, isMobile }) => {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('[data-page="customers"]').click();
  await page.getByRole('button', { name: 'Add customer' }).click();
  await page.locator('#modal input[name="name"]').fill('Persistence Test Customer');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Persistence Test Customer');

  await page.getByRole('button', { name: 'Ledger' }).click();
  await page.getByRole('button', { name: 'Add entry' }).click();
  await page.locator('#modal input[name="amount"]').fill('1250');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('1,250');

  await page.reload();
  await expect(page.locator('#view')).toContainText('Persistence Test Customer');
  await page.locator('[data-page="ledger"]').click();
  await expect(page.locator('#view')).toContainText('Persistence Test Customer');
  await expect(page.locator('#view')).toContainText('1,250');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  expect(stored.businesses[0].data.customers).toHaveLength(1);
  expect(stored.businesses[0].data.entries).toHaveLength(1);
});

test('layout stays within common viewport widths', async ({ page }) => {
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth
    }));
    expect(dimensions.document, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
    await expect(page.locator('#view')).toBeVisible();
  }
});
