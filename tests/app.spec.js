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
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
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
  expect(business.products.find(product => product.sku === 'SKU-TEST-01').stock).toBe(12);
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


test('family centre supports shared expenses, settlements, shopping and member chores', async ({ page, isMobile }) => {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('[data-page="personal"]').click();
  await page.getByRole('button', { name: 'Household', exact: true }).click();

  for (const name of ['Asha', 'Ravi']) {
    await page.getByRole('button', { name: 'Add member' }).click();
    await page.locator('#modal input[name="name"]').fill(name);
    await page.locator('#saveModal').click();
  }

  await page.getByRole('button', { name: 'Add shared expense' }).click();
  await page.locator('#modal input[name="description"]').fill('Monthly groceries');
  await page.locator('#modal input[name="amount"]').fill('1200');
  await page.locator('#modal input[name="participants"]').first().check();
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Monthly groceries');

  await page.getByRole('button', { name: 'Record settlement' }).click();
  await page.locator('#modal input[name="amount"]').fill('300');
  await page.locator('#saveModal').click();

  await page.getByRole('button', { name: 'Add item' }).click();
  await page.locator('#modal input[name="name"]').fill('Rice');
  await page.locator('#modal input[name="quantity"]').fill('5 kg');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Rice');

  await page.getByRole('button', { name: 'Tasks & reminders' }).click();
  await page.getByRole('button', { name: 'Add task' }).click();
  await page.locator('#modal input[name="name"]').fill('Clean kitchen');
  await page.locator('#modal select[name="memberId"]').selectOption({ label: 'Asha' });
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Asha');

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  expect(stored.personal.sharedExpenses).toHaveLength(1);
  expect(stored.personal.settlements).toHaveLength(1);
  expect(stored.personal.shoppingItems).toHaveLength(1);
  expect(stored.personal.tasks[0].memberId).toBe(stored.personal.members[0].id);
});

test('recurring bills, loan EMI and vehicle records work', async ({ page, isMobile }) => {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('[data-page="personal"]').click();
  await page.getByRole('button', { name: 'Household', exact: true }).click();
  await page.getByRole('button', { name: 'Add household bill' }).click();
  await page.locator('#modal input[name="name"]').fill('Electricity');
  await page.locator('#modal input[name="amount"]').fill('1500');
  await page.locator('#saveModal').click();
  await page.getByRole('button', { name: 'Mark paid' }).click();
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  expect(stored.personal.bills).toHaveLength(2);
  expect(stored.personal.bills[0].status).toBe('Paid');

  await page.getByRole('button', { name: 'Life & assets' }).click();
  await page.getByRole('button', { name: 'Add loan' }).click();
  await page.locator('#modal input[name="name"]').fill('Personal loan');
  await page.locator('#modal input[name="principal"]').fill('50000');
  await page.locator('#modal input[name="outstanding"]').fill('50000');
  await page.locator('#modal input[name="emi"]').fill('5000');
  await page.locator('#saveModal').click();
  await page.getByRole('button', { name: 'Record EMI' }).click();
  await page.locator('#modal input[name="amount"]').fill('5000');
  await page.locator('#modal input[name="principalPaid"]').fill('4000');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('46,000');

  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await page.locator('#modal input[name="name"]').fill('Family car');
  await page.locator('#modal input[name="odometer"]').fill('25000');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Family car');

  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  expect(stored.personal.loans).toHaveLength(1);
  expect(stored.personal.loans[0].outstanding).toBe(46000);
  expect(stored.personal.vehicles).toHaveLength(1);
  expect(stored.personal.transactions).toHaveLength(1);
});

test('personal record deletion can be restored from the recycle bin', async ({ page, isMobile }) => {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('[data-page="personal"]').click();
  await page.getByRole('button', { name: 'Documents' }).click();
  await page.getByRole('button', { name: 'Add record' }).click();
  await page.locator('#modal input[name="name"]').fill('Insurance policy');
  await page.locator('#saveModal').click();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: false }).last().click();
  await expect(page.locator('#view')).toContainText('Recently deleted');
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.locator('#view')).toContainText('Insurance policy');
});


test('opens with a tracking query string without JavaScript errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?utm_source=chatgpt.com');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.locator('#view')).toContainText('Quick actions');
  expect(errors).toEqual([]);
});

test('family expense and settlement editors calculate member balances correctly', async ({ page, isMobile }) => {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('[data-page="personal"]').click();
  await page.getByRole('button', { name: 'Household', exact: true }).click();

  for (const name of ['Asha', 'Ravi']) {
    await page.getByRole('button', { name: 'Add member' }).click();
    await page.locator('#modal input[name="name"]').fill(name);
    await page.locator('#saveModal').click();
  }

  await page.getByRole('button', { name: 'Add shared expense' }).click();
  await expect(page.locator('#modalTitle')).toHaveText('Shared household expense');
  await page.locator('#modal input[name="description"]').fill('Groceries');
  await page.locator('#modal input[name="amount"]').fill('1200');
  await page.locator('#saveModal').click();

  await page.getByRole('button', { name: 'Record settlement' }).click();
  await expect(page.locator('#modalTitle')).toHaveText('Record family settlement');
  await page.locator('#modal input[name="amount"]').fill('300');
  await page.locator('#saveModal').click();

  let rows = page.locator('#view .report-row');
  await expect(rows.filter({ hasText: 'Asha' }).first()).toContainText('₹300.00');
  await expect(rows.filter({ hasText: 'Ravi' }).first()).toContainText('₹-300.00');

  await page.locator('[data-pedit="sharedExpenses"]').click();
  await page.locator('#modal input[name="amount"]').fill('1600');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('1,600');

  await page.locator('[data-pedit="settlements"]').click();
  await page.locator('#modal input[name="amount"]').fill('100');
  await page.locator('#saveModal').click();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  expect(stored.personal.sharedExpenses[0].amount).toBe(1600);
  expect(stored.personal.settlements[0].amount).toBe(100);
  expect(stored.personal.members).toHaveLength(2);
});


test('upgrade centre supports family budgets, savings, calendar, chores and document vault', async ({ page, isMobile }) => {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('[data-page="upgrades"]').click();
  await expect(page.locator('#view')).toContainText('Upgrade Centre');

  await page.locator('[data-upgrade-action="tab"][data-tab="family"]').click();
  await page.locator('[data-upgrade-action="add-budget"]').click();
  await page.locator('#modal input[name="amount"]').fill('6000');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Shared budgets');

  await page.locator('[data-upgrade-action="add-goal"]').click();
  await page.locator('#modal input[name="name"]').fill('Family emergency fund');
  await page.locator('#modal input[name="target"]').fill('50000');
  await page.locator('#saveModal').click();

  await page.locator('[data-upgrade-action="tab"][data-tab="calendar"]').click();
  await page.locator('[data-upgrade-action="add-calendar"]').click();
  await page.locator('#modal input[name="title"]').fill('Family meeting');
  await page.locator('#saveModal').click();
  await page.locator('[data-upgrade-action="add-chore"]').click();
  await page.locator('#modal input[name="title"]').fill('Clean living room');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Clean living room');

  await page.locator('[data-upgrade-action="tab"][data-tab="vault"]').click();
  await page.locator('[data-upgrade-action="add-vault"]').click();
  await page.locator('#modal input[name="name"]').fill('Home insurance policy');
  await page.locator('#saveModal').click();
  await expect(page.locator('#view')).toContainText('Home insurance policy');

  await page.locator('[data-upgrade-action="tab"][data-tab="backup"]').click();
  await expect(page.locator('#view')).toContainText('Latest automatic backup');
  const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.autobackup.v1')));
  expect(backup.data).toContain('Family emergency fund');
  expect(backup.data).toContain('Family meeting');
  expect(backup.data).toContain('Home insurance policy');
});

test('business ledger duplicate detection warns and deleted entries can be restored', async ({ page, isMobile }) => {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('[data-page="customers"]').click();
  await page.getByRole('button', { name: 'Add customer' }).click();
  await page.locator('#modal input[name="name"]').fill('Duplicate Check Customer');
  await page.locator('#saveModal').click();
  await page.getByRole('button', { name: 'Ledger', exact: true }).click();
  await page.locator('#ledgerAdd').click();
  await page.locator('#modal input[name="amount"]').fill('725');
  await page.locator('#saveModal').click();

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#ledgerAdd').click();
  await page.locator('#modal input[name="amount"]').fill('725');
  await page.locator('#saveModal').click();
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  expect(stored.businesses[0].data.entries).toHaveLength(2);

  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-delete-entry]').last().click();
  await expect(page.locator('#view')).toContainText('Upgrade Centre');
  await page.locator('[data-upgrade-action="tab"][data-tab="backup"]').click();
  await expect(page.locator('#view')).toContainText('business-entry');
  await page.locator('[data-upgrade-action="restore-trash"]').click();
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalKhata.v1')));
  expect(stored.businesses[0].data.entries).toHaveLength(2);
  expect(stored.upgrades.trash).toHaveLength(0);
});
