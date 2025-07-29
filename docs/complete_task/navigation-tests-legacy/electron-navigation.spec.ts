
import { test, expect, _electron } from '@playwright/test';

test.describe('Electron Navigation', () => {
  let electronApp;

  test.beforeEach(async () => {
    // Path to the packaged Electron app
    const electronAppPath = 'electron-build/electron/main.js'; 

    electronApp = await _electron.launch({
      args: [electronAppPath],
    });
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should open the editor when creating a new project', async () => {
    const page = await electronApp.firstWindow();

    // Click the "New project" button
    await page.click('text=New project');

    // Wait for the editor to load
    const mediaPanel = await page.waitForSelector('[data-testid="media-panel"]');

    // Assert that the editor is visible
    await expect(mediaPanel).toBeVisible();
  });
});
