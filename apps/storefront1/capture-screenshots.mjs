#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import path from 'path';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SCREENSHOTS_DIR = './tests/screenshots';
const STOREFRONT_URL = 'http://sharewear.local:8201/gb';

async function captureScreenshots() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('📸 Capturing mega-menu screenshots...\n');

    // 1. Load homepage
    console.log('1. Loading homepage...');
    await page.goto(STOREFRONT_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-homepage.png'),
      fullPage: true
    });
    console.log('   ✓ Homepage captured');

    // 2. Capture navigation bar
    console.log('\n2. Capturing navigation bar...');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-navigation-bar.png'),
      clip: { x: 0, y: 0, width: 1920, height: 200 }
    });
    console.log('   ✓ Navigation bar captured');

    // 3. Find and hover over nav items
    console.log('\n3. Testing navigation items...');

    // Use evaluate to get nav items info
    const navItemsInfo = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('nav a, nav button'));
      return items.map((item, index) => ({
        index,
        text: item.textContent?.trim() || '',
        selector: item.tagName.toLowerCase() + (item.className ? '.' + item.className.split(' ')[0] : ''),
        x: item.getBoundingClientRect().x,
        y: item.getBoundingClientRect().y,
        width: item.getBoundingClientRect().width,
        height: item.getBoundingClientRect().height
      })).filter(item => item.width > 0 && item.height > 0 && item.text.length > 0 && item.text.length < 50);
    });

    console.log(`   Found ${navItemsInfo.length} visible navigation items`);

    for (let i = 0; i < Math.min(navItemsInfo.length, 6); i++) {
      try {
        const itemInfo = navItemsInfo[i];
        console.log(`   Testing item ${i + 1}: "${itemInfo.text}"`);

        // Hover using coordinates
        await page.mouse.move(itemInfo.x + itemInfo.width / 2, itemInfo.y + itemInfo.height / 2);
        await wait(800);

        const filename = `03-nav-hover-${i + 1}-${itemInfo.text.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 20)}.png`;
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, filename),
          clip: { x: 0, y: 0, width: 1920, height: 1000 }
        });
        console.log(`   ✓ Captured: ${filename}`);
      } catch (err) {
        console.log(`   ⚠ Skipped item ${i + 1}: ${err.message}`);
      }
    }

    // 4. Check for mega-menu panels
    console.log('\n4. Looking for mega-menu panels...');
    if (navItemsInfo.length > 0) {
      const firstItem = navItemsInfo[0];
      await page.mouse.move(firstItem.x + firstItem.width / 2, firstItem.y + firstItem.height / 2);
      await wait(800);

      // Look for mega-menu indicators
      const hasMegaMenu = await page.evaluate(() => {
        const panels = Array.from(document.querySelectorAll('[class*="mega"], [class*="panel"], [class*="dropdown"]'));
        return panels.some(p => p.offsetHeight > 0);
      });

      console.log(`   Mega-menu detected: ${hasMegaMenu ? 'YES' : 'NO'}`);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '04-mega-menu-example.png'),
        clip: { x: 0, y: 0, width: 1920, height: 1000 }
      });
      console.log('   ✓ Mega-menu example captured');
    }

    // 5. Mobile view
    console.log('\n5. Testing mobile view...');
    await page.setViewport({ width: 375, height: 667 });
    await page.goto(STOREFRONT_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-mobile-view.png'),
      fullPage: true
    });
    console.log('   ✓ Mobile view captured');

    // 6. Tablet view
    console.log('\n6. Testing tablet view...');
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(STOREFRONT_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06-tablet-view.png'),
      clip: { x: 0, y: 0, width: 768, height: 600 }
    });
    console.log('   ✓ Tablet view captured');

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`   Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
