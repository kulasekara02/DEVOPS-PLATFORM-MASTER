/**
 * End-to-End Tests using Playwright
 *
 * These tests verify the complete user flow through the application.
 * Run with: npx playwright test
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('DevOps Platform E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('Navigation', () => {
    test('should load the dashboard page', async ({ page }) => {
      await expect(page).toHaveTitle(/DevOps Platform/);
      await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
    });

    test('should navigate to Items page', async ({ page }) => {
      await page.click('text=Items');
      await expect(page.getByRole('heading', { name: /Items/i })).toBeVisible();
    });

    test('should navigate to Jobs page', async ({ page }) => {
      await page.click('text=Jobs');
      await expect(page.getByRole('heading', { name: /Jobs/i })).toBeVisible();
    });

    test('should navigate to Health page', async ({ page }) => {
      await page.click('text=Health');
      await expect(page.getByRole('heading', { name: /Health/i })).toBeVisible();
    });
  });

  test.describe('Dashboard', () => {
    test('should display system stats', async ({ page }) => {
      await expect(page.getByText(/Total Items/i)).toBeVisible();
      await expect(page.getByText(/Active Jobs/i)).toBeVisible();
      await expect(page.getByText(/System Status/i)).toBeVisible();
    });
  });

  test.describe('Items Management', () => {
    test('should create a new item', async ({ page }) => {
      await page.click('text=Items');

      // Click create button
      await page.click('button:has-text("Create Item")');

      // Fill form
      await page.fill('input[name="name"]', 'E2E Test Item');
      await page.fill('textarea[name="description"]', 'Created by E2E test');

      // Submit
      await page.click('button:has-text("Save")');

      // Verify item appears in list
      await expect(page.getByText('E2E Test Item')).toBeVisible();
    });

    test('should edit an existing item', async ({ page }) => {
      await page.click('text=Items');

      // Find and click edit on first item
      await page.click('[data-testid="edit-item"]:first-child');

      // Update name
      await page.fill('input[name="name"]', 'Updated E2E Item');

      // Save
      await page.click('button:has-text("Save")');

      // Verify update
      await expect(page.getByText('Updated E2E Item')).toBeVisible();
    });

    test('should delete an item', async ({ page }) => {
      await page.click('text=Items');

      // Get initial count
      const initialItems = await page.locator('[data-testid="item-row"]').count();

      // Click delete on first item
      await page.click('[data-testid="delete-item"]:first-child');

      // Confirm deletion
      await page.click('button:has-text("Confirm")');

      // Verify item was deleted
      const finalItems = await page.locator('[data-testid="item-row"]').count();
      expect(finalItems).toBe(initialItems - 1);
    });
  });

  test.describe('Jobs', () => {
    test('should create a new job', async ({ page }) => {
      await page.click('text=Jobs');

      // Click create job button
      await page.click('button:has-text("Create Job")');

      // Select job type
      await page.selectOption('select[name="type"]', 'processData');

      // Submit
      await page.click('button:has-text("Submit")');

      // Verify job was created
      await expect(page.getByText(/Job queued/i)).toBeVisible();
    });

    test('should display job status', async ({ page }) => {
      await page.click('text=Jobs');

      // Check for job status indicators
      await expect(page.locator('[data-testid="job-status"]').first()).toBeVisible();
    });
  });

  test.describe('Health Status', () => {
    test('should display all health checks', async ({ page }) => {
      await page.click('text=Health');

      // Check for health status components
      await expect(page.getByText(/API Status/i)).toBeVisible();
      await expect(page.getByText(/Database/i)).toBeVisible();
      await expect(page.getByText(/Redis/i)).toBeVisible();
    });

    test('should show healthy status', async ({ page }) => {
      await page.click('text=Health');

      // Check for healthy indicators
      const healthyIndicators = page.locator('text=Healthy');
      await expect(healthyIndicators.first()).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should show 404 page for invalid routes', async ({ page }) => {
      await page.goto(`${BASE_URL}/nonexistent-page`);
      await expect(page.getByText(/404|Not Found/i)).toBeVisible();
    });
  });

  test.describe('Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);

      // Mobile menu should be present
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);

      await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
    });
  });
});
