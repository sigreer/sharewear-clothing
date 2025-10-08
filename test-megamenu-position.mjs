import { chromium } from 'playwright';

async function testMegaMenuPosition() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Navigate to storefront
    await page.goto('http://sharewear.local:8201');
    await page.waitForLoadState('networkidle');

    // Hover over "gadgets & gizmos" menu item to trigger mega menu
    const menuItem = page.locator('text=gadgets & gizmos').first();
    await menuItem.hover();

    // Wait for mega menu to appear
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({
      path: 'megamenu-position-test.png',
      fullPage: false
    });

    console.log('Screenshot saved: megamenu-position-test.png');

    // Get positions for debugging
    const menuItemBox = await menuItem.boundingBox();
    const megaMenuPanel = page.locator('.rounded-b-md.border-2').first();
    const panelBox = await megaMenuPanel.boundingBox();

    console.log('Menu item position:', menuItemBox);
    console.log('Mega menu panel position:', panelBox);

    if (menuItemBox && panelBox) {
      const menuItemCenter = menuItemBox.x + (menuItemBox.width / 2);
      const panelCenter = panelBox.x + (panelBox.width / 2);
      console.log('Menu item center X:', menuItemCenter);
      console.log('Panel center X:', panelCenter);
      console.log('Difference:', Math.abs(menuItemCenter - panelCenter), 'pixels');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testMegaMenuPosition();
