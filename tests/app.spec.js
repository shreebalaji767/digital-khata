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
    ['Purchases', 'Purchase invoices'],
    ['Cashbook', 'Cashbook'],
    ['Returns', 'Sales and purchase returns'],
    ['Stock History', 'Stock movement history'],
    ['Expenses', 'Business expenses'],
    ['Reminders', 'Reminder list'],
    ['Reports', 'Profit & loss'],
    ['Settings & Backup', 'Business profile'],
    ['Personal & Family', 'Personal & family workspace']
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

  await page.getByRole('button', { name: 'Ledger', exact: true }).click();
  await page.locator('#ledgerAdd').click();
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

test('new business modules render and local QR library is available', async ({ page, isMobile }) => {
  const pages = ['purchases', 'cashbook', 'returns', 'stockHistory'];
  for (const name of pages) {
    if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('[data-page="' + name + '"]').click();
    await expect(page.locator('#view')).not.toBeEmpty();
  }
  expect(await page.evaluate(() => typeof window.QRCode)).toBe('function');
});

test('purchase entry increases stock and supports a partial supplier payment', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Purchase workflow is covered by desktop integration tests; mobile navigation is tested separately');
  await page.locator('[data-page="suppliers"]').click();
  await page.getByRole('button', { name: 'Add supplier' }).click();
  await page.locator('#modal input[name="name"]').fill('Test Supplier');
  await page.locator('#saveModal').click();

  await page.locator('[data-page="inventory"]').click();
  await page.getByRole('button', { name: 'Add product' }).click();
  await page.locator('#modal input[name="name"]').fill('Test Product');
  await page.locator('#modal input[name="sku"]').fill('SKU-TEST-01');
  await page.locator('#modal input[name="cost"]').fill('100');
  await page.locator('#modal input[name="price"]').fill('150');
  await page.locator('#modal input[name="stock"]').fill('10');
  await page.locator('#saveModal').click();

  await page.locator('[data-page="purchases"]').click();
  await page.getByRole('button', { name: 'Record purchase' }).click();
  await page.locator('#modal select[name="supplierId"]').selectOption({ label: 'Test Supplier' });
  await page.locator('#modal select[name="itemProduct"]').selectOption({ label: 'Test Product · SKU-TEST-01' });
  await page.locator('#modal input[name="itemQty"]').fill('2');
  await page.locator('#saveModal').click();

  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  let business = stored.businesses[0].data;
  expect(business.products[0].stock).toBe(12);
  expect(business.purchases).toHaveLength(1);
  await page.locator('[data-pay-purchase]').click();
  await page.locator('#modal input[name="amount"]').fill('100');
  await page.locator('#saveModal').click();
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  business = stored.businesses[0].data;
  expect(business.purchases[0].paidAmount).toBe(100);
  expect(business.purchases[0].status).toBe('partial');
});

test('multi-item invoice records partial payments and exposes a local UPI QR', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Invoice workflow is covered by desktop integration tests; mobile navigation is tested separately');
  await page.locator('[data-page="customers"]').click();
  await page.getByRole('button', { name: 'Add customer' }).click();
  await page.locator('#modal input[name="name"]').fill('Test Customer');
  await page.locator('#saveModal').click();

  await page.locator('[data-page="inventory"]').click();
  await page.getByRole('button', { name: 'Add product' }).click();
  await page.locator('#modal input[name="name"]').fill('Invoice Product');
  await page.locator('#modal input[name="sku"]').fill('SKU-INVOICE-01');
  await page.locator('#modal input[name="cost"]').fill('40');
  await page.locator('#modal input[name="price"]').fill('100');
  await page.locator('#modal input[name="stock"]').fill('10');
  await page.locator('#saveModal').click();

  await page.locator('[data-page="settings"]').click();
  await page.locator('#profileForm input[name="upi"]').fill('merchant@upi');
  await page.locator('#profileForm button[type="submit"]').click();

  await page.locator('[data-page="invoices"]').click();
  await page.getByRole('button', { name: 'Create invoice' }).click();
  await page.locator('#modal select[name="customerId"]').selectOption({ label: 'Test Customer' });
  await page.locator('#modal select[name="itemProduct"]').first().selectOption({ label: 'Invoice Product · SKU-INVOICE-01' });
  await page.getByRole('button', { name: 'Add item' }).click();
  await page.locator('#modal select[name="itemProduct"]').nth(1).selectOption({ label: 'Invoice Product · SKU-INVOICE-01' });
  await page.locator('#modal input[name="itemQty"]').nth(1).fill('2');
  page.on('popup', popup => popup.close());
  await page.locator('#saveModal').click();

  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  let business = stored.businesses[0].data;
  expect(business.invoices[0].items).toHaveLength(2);
  expect(business.invoices[0].total).toBeGreaterThan(0);
  await page.locator('[data-pay-invoice]').click();
  await page.locator('#modal input[name="amount"]').fill('50');
  await page.locator('#saveModal').click();
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  business = stored.businesses[0].data;
  expect(business.invoices[0].paidAmount).toBe(50);
  expect(business.invoices[0].status).toBe('partial');
  await page.getByRole('button', { name: 'UPI QR' }).click();
  await expect(page.locator('#paymentQr canvas, #paymentQr img')).toBeVisible();
});

test('personal finances, budgets, household bills and records stay separate from business books', async ({ page, isMobile }) => {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('[data-page="personal"]').click();
  await expect(page.locator('#view')).toContainText('Personal & family workspace');
  await page.getByRole('button', { name: 'Money', exact: true }).click();
  await page.getByRole('button', { name: 'Add transaction' }).click();
  await page.locator('#modal select[name="type"]').selectOption('income');
  await page.locator('#modal input[name="amount"]').fill('35000');
  await page.locator('#modal input[name="person"]').fill('Monthly salary');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('35,000');

  await page.getByRole('button', { name: 'Budgets & savings' }).click();
  await page.getByRole('button', { name: 'Budget' }).click();
  await page.locator('#modal input[name="amount"]').fill('5000');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Monthly budgets');

  await page.getByRole('button', { name: 'Household', exact: true }).click();
  await page.getByRole('button', { name: 'Add member' }).click();
  await page.locator('#modal input[name="name"]').fill('Family Member');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Family Member');
  await page.getByRole('button', { name: 'Add household bill' }).click();
  await page.locator('#modal input[name="name"]').fill('Electricity');
  await page.locator('#modal input[name="amount"]').fill('1800');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Electricity');

  await page.getByRole('button', { name: 'Tasks & reminders' }).click();
  await page.getByRole('button', { name: 'Add task' }).click();
  await page.locator('#modal input[name="name"]').fill('Pay electricity');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Pay electricity');

  await page.getByRole('button', { name: 'Documents' }).click();
  await page.getByRole('button', { name: 'Add record' }).click();
  await page.locator('#modal input[name="name"]').fill('Vehicle insurance');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Vehicle insurance');

  await page.reload();
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('[data-page="personal"]').click();
  await page.getByRole('button', { name: 'Money', exact: true }).click();
  await expect(page.locator('#view')).toContainText('Monthly salary');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  expect(stored.personal.transactions).toHaveLength(1);
  expect(stored.personal.budgets).toHaveLength(1);
  expect(stored.personal.bills).toHaveLength(1);
  expect(stored.personal.members).toHaveLength(1);
  expect(stored.personal.tasks).toHaveLength(1);
  expect(stored.personal.documents).toHaveLength(1);
  expect(stored.businesses[0].data.customers).toHaveLength(0);
});
