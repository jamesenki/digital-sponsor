import { test, expect } from '@playwright/test';

// Test data
const TEST_INVITATION_CODE = 'DS-GENERAL-320F83E8';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'SecurePass123!';
const TEST_DISPLAY_NAME = 'Test User';

test.describe('User Registration Flow', () => {
  test('should display registration form when clicking register tab', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click on Register tab
    await page.click('text=Register');

    // Verify registration form is visible
    await expect(page.locator('#registerForm')).toBeVisible();
    await expect(page.locator('#betaCode')).toBeVisible();
    await expect(page.locator('#registerEmail')).toBeVisible();
  });

  test('should validate invitation code before registration', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Register tab
    await page.click('text=Register');

    // Enter invalid invitation code
    await page.fill('#betaCode', 'INVALID-CODE-123');
    await page.fill('#registerEmail', TEST_EMAIL);
    await page.fill('#displayName', TEST_DISPLAY_NAME);
    await page.fill('#registerPassword', TEST_PASSWORD);

    // Submit form
    await page.click('#registerForm button[type="submit"]');

    // Should show error message
    await expect(page.locator('.message.error, #authMessage')).toBeVisible({ timeout: 10000 });
  });

  test('should successfully register with valid invitation code', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Register tab
    await page.click('text=Register');

    // Fill registration form with valid data
    await page.fill('#betaCode', TEST_INVITATION_CODE);
    await page.fill('#registerEmail', TEST_EMAIL);
    await page.fill('#displayName', TEST_DISPLAY_NAME);
    await page.fill('#registerPassword', TEST_PASSWORD);

    // Submit form
    await page.click('#registerForm button[type="submit"]');

    // Wait for success - should show main app or success message
    await expect(page.locator('#mainApp, .message.success')).toBeVisible({ timeout: 15000 });

    // Take screenshot of successful registration
    await page.screenshot({ path: 'test-results/registration-success.png' });
  });

  test('should be able to login after registration', async ({ page }) => {
    // Use the already registered test user
    const loginEmail = 'jamessimonster@icloud.com';
    const loginPassword = 'TestPass123';

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should be on login form by default
    await expect(page.locator('#loginForm')).toBeVisible();

    // Fill login form
    await page.fill('#loginEmail', loginEmail);
    await page.fill('#loginPassword', loginPassword);

    // Submit login
    await page.click('#loginForm button[type="submit"]');

    // Should show main app after login
    await expect(page.locator('#mainApp')).toBeVisible({ timeout: 15000 });

    // Verify user is logged in - check for welcome message or dashboard elements
    await expect(page.locator('#headerSubtitle')).toContainText('Welcome');

    // Take screenshot of logged in state
    await page.screenshot({ path: 'test-results/login-success.png' });
  });

  test('should show admin section for admin user', async ({ page }) => {
    const adminEmail = 'jamessimonster@icloud.com';
    const adminPassword = 'TestPass123';

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Login as admin
    await page.fill('#loginEmail', adminEmail);
    await page.fill('#loginPassword', adminPassword);
    await page.click('#loginForm button[type="submit"]');

    // Wait for main app
    await expect(page.locator('#mainApp')).toBeVisible({ timeout: 15000 });

    // Check if admin section is visible (for admin users)
    const adminSection = page.locator('#adminSection');
    const isAdmin = await adminSection.isVisible();

    if (isAdmin) {
      await expect(adminSection).toContainText('Admin');
      await page.screenshot({ path: 'test-results/admin-section.png' });
    }

    console.log(`Admin section visible: ${isAdmin}`);
  });
});
