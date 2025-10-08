#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import path from 'path';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SCREENSHOTS_DIR = './tests/screenshots/navigation-detailed';
const STOREFRONT_URL = 'http://sharewear.local:8201/gb';

async function captureDetailedNavigation() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('📸 Capturing detailed navigation screenshots...\n');

    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(STOREFRONT_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    // Get all nav items in the red bar
    const navItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('nav a, nav button'));
      return items.map((item, index) => ({
        index,
        text: item.textContent?.trim() || '',
        tagName: item.tagName.toLowerCase(),
        className: item.className,
        x: item.getBoundingClientRect().x,
        y: item.getBoundingClientRect().y,
        width: item.getBoundingClientRect().width,
        height: item.getBoundingClientRect().height,
        inRedBar: item.getBoundingClientRect().y < 150 // Approximate red bar position
      })).filter(item =>
        item.width > 0 &&
        item.height > 0 &&
        item.text.length > 0 &&
        item.inRedBar
      );
    });

    console.log(`Found ${navItems.length} navigation items in the red bar:`);
    navItems.forEach(item => {
      console.log(`  - "${item.text}" (${item.tagName})`);
    });

    // Test each navigation item
    for (let i = 0; i < navItems.length; i++) {
      const item = navItems[i];
      console.log(`\nTesting: "${item.text}"`);

      // Move mouse to the item
      await page.mouse.move(item.x + item.width / 2, item.y + item.height / 2);
      await wait(1000);

      // Check for any visible dropdowns or mega-menus
      const menuInfo = await page.evaluate(() => {
        // Look for any element that appeared
        const possibleMenus = Array.from(document.querySelectorAll('div, ul, nav')).filter(el => {
          const rect = el.getBoundingClientRect();
          const styles = window.getComputedStyle(el);
          return (
            rect.width > 200 &&
            rect.height > 100 &&
            rect.top > 80 &&
            rect.top < 300 &&
            styles.position !== 'static' &&
            styles.display !== 'none' &&
            styles.visibility !== 'hidden'
          );
        });

        return {
          foundMenus: possibleMenus.length,
          menuInfo: possibleMenus.map(m => ({
            tagName: m.tagName,
            className: m.className,
            width: m.getBoundingClientRect().width,
            height: m.getBoundingClientRect().height,
            top: m.getBoundingClientRect().top,
            childCount: m.children.length,
            hasText: (m.textContent?.trim().length || 0) > 10
          }))
        };
      });

      console.log(`  Found ${menuInfo.foundMenus} potential menu elements`);
      if (menuInfo.foundMenus > 0) {
        console.log(`  Menu details:`, JSON.stringify(menuInfo.menuInfo, null, 2));
      }

      // Take screenshot
      const filename = `nav-${i + 1}-${item.text.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30)}.png`;
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, filename),
        clip: { x: 0, y: 0, width: 1920, height: 900 }
      });
      console.log(`  ✓ Screenshot saved: ${filename}`);
    }

    // Also check the scroll navbar component
    console.log('\nChecking for scroll navbar...');
    const hasScrollNav = await page.evaluate(() => {
      const scrollNav = document.querySelector('[data-scroll-navbar], [class*="scroll"]');
      return scrollNav !== null;
    });
    console.log(`  Scroll navbar found: ${hasScrollNav ? 'YES' : 'NO'}`);

    // Take a final overview screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '00-nav-overview.png'),
      clip: { x: 0, y: 0, width: 1920, height: 400 }
    });

    console.log('\n✅ Detailed navigation screenshots captured!');
    console.log(`   Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

captureDetailedNavigation().catch(console.error);
