#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import path from 'path';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SCREENSHOTS_DIR = './tests/screenshots/admin';
const ADMIN_URL = 'http://sharewear.local:9000';
const MEGA_MENU_URL = `${ADMIN_URL}/app/catalog/mega-menu`;

async function captureAdminScreenshots() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('📸 Capturing admin mega-menu screenshots...\n');

    // 1. Go to admin login
    console.log('1. Navigating to admin...');
    await page.goto(`${ADMIN_URL}/app`, { waitUntil: 'networkidle0', timeout: 30000 });
    await wait(2000);

    // Check if we need to login
    const needsLogin = await page.evaluate(() => {
      return window.location.href.includes('/login');
    });

    if (needsLogin) {
      console.log('   Login page detected');
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '01-login-page.png'),
        fullPage: true
      });

      // Try to login with default credentials
      const emailInput = await page.$('input[name="email"], input[type="email"]');
      const passwordInput = await page.$('input[name="password"], input[type="password"]');

      if (emailInput && passwordInput) {
        console.log('   Attempting login...');
        await emailInput.type('admin@medusa-test.com');
        await passwordInput.type('supersecret');

        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await wait(3000);

          const loginSuccess = await page.evaluate(() => {
            return !window.location.href.includes('/login');
          });

          if (loginSuccess) {
            console.log('   ✓ Login successful');
          } else {
            console.log('   ⚠ Login failed or credentials incorrect');
            console.log('   Please login manually and run this script again');
            return;
          }
        }
      }
    } else {
      console.log('   ✓ Already logged in');
    }

    // 2. Navigate to mega-menu page
    console.log('\n2. Navigating to mega-menu configuration...');
    await page.goto(MEGA_MENU_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await wait(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-mega-menu-page.png'),
      fullPage: true
    });
    console.log('   ✓ Mega-menu page captured');

    // 3. Test Global Config Tab
    console.log('\n3. Testing Global Config tab...');
    const globalTab = await page.$('[role="tab"]:has-text("Global Config"), button:has-text("Global Config")');

    if (globalTab) {
      await globalTab.click();
      await wait(1000);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '03-global-config-tab.png'),
        fullPage: true
      });
      console.log('   ✓ Global config tab captured');
    }

    // 4. Test Categories Tab
    console.log('\n4. Testing Categories tab...');
    const categoriesTab = await page.$('[role="tab"]:has-text("Categories"), button:has-text("Categories")');

    if (categoriesTab) {
      await categoriesTab.click();
      await wait(1000);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '04-categories-tab.png'),
        fullPage: true
      });
      console.log('   ✓ Categories tab captured');
    }

    // 5. Select a category
    console.log('\n5. Testing category selection...');
    const categorySelector = await page.$('button[role="combobox"]');

    if (categorySelector) {
      await categorySelector.click();
      await wait(500);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '05-category-selector-open.png'),
        fullPage: true
      });
      console.log('   ✓ Category selector captured');

      // Select first option
      const firstOption = await page.$('[role="option"]');
      if (firstOption) {
        const text = await page.evaluate(el => el.textContent, firstOption);
        console.log(`   Selecting category: ${text}`);

        await firstOption.click();
        await wait(1500);

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, '06-category-selected.png'),
          fullPage: true
        });
        console.log('   ✓ Category configuration captured');
      }
    }

    // 6. Check for configuration fields
    console.log('\n6. Checking configuration fields...');
    const fields = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      return labels.map(l => l.textContent?.trim()).filter(Boolean);
    });

    console.log(`   Found fields: ${fields.join(', ')}`);

    // 7. Look for specific UI elements
    const hasMenuLayout = await page.$('text=Menu Layout');
    const hasDisplayAsColumn = await page.$('input[id="displayAsColumn"]');
    const hasColumnTitle = await page.$('text=Column Title');
    const hasIcon = await page.$('text=Icon');

    console.log('\n7. UI Elements detected:');
    console.log(`   - Menu Layout dropdown: ${hasMenuLayout ? 'YES' : 'NO'}`);
    console.log(`   - Display as Column checkbox: ${hasDisplayAsColumn ? 'YES' : 'NO'}`);
    console.log(`   - Column Title field: ${hasColumnTitle ? 'YES' : 'NO'}`);
    console.log(`   - Icon field: ${hasIcon ? 'YES' : 'NO'}`);

    console.log('\n✅ All admin screenshots captured successfully!');
    console.log(`   Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('❌ Error capturing admin screenshots:', error);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'error-state.png'),
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

captureAdminScreenshots().catch(console.error);
