import { chromium } from '@playwright/test'

async function captureSweatshirtsConfig() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  })
  const page = await context.newPage()

  try {
    console.log('Navigating to admin login...')
    await page.goto('http://sharewear.local:9000/app/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    await page.waitForTimeout(2000)

    // Take screenshot of login page
    await page.screenshot({ path: 'login-page.png' })
    console.log('Screenshot saved: login-page.png')

    // Login - try different selectors
    console.log('Filling email...')
    const emailInput = await page.locator('input[placeholder="Email"], input[name="email"], input[id="email"]').first()
    await emailInput.fill('s@sideways.systems')

    console.log('Filling password...')
    const passwordInput = await page.locator('input[type="password"]').first()
    await passwordInput.fill('H5n4#Grub3r')

    await page.waitForTimeout(500)

    console.log('Clicking login button...')
    await page.click('button:has-text("Continue")')

    // Wait for navigation after login
    await page.waitForURL('**/app/**', { timeout: 10000 })
    await page.waitForTimeout(2000)

    console.log('Navigating to mega-menu config...')
    await page.goto('http://sharewear.local:9000/app/catalog/mega-menu', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    await page.waitForTimeout(3000)

    await page.screenshot({
      path: '01-megamenu-page.png',
      fullPage: true
    })
    console.log('Screenshot saved: 01-megamenu-page.png')

    // Click on the Categories tab
    console.log('Clicking Categories tab...')
    await page.getByRole('tab', { name: 'Categories' }).click()
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: '02-categories-tab.png',
      fullPage: true
    })
    console.log('Screenshot saved: 02-categories-tab.png')

    // Click on the category selector dropdown trigger
    console.log('Opening category selector...')
    await page.getByRole('combobox').click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: '03-category-dropdown.png',
      fullPage: true
    })
    console.log('Screenshot saved: 03-category-dropdown.png')

    // Select Sweatshirts
    console.log('Selecting Sweatshirts...')
    await page.getByRole('option', { name: /sweatshirts/i }).click()
    await page.waitForTimeout(2000)

    await page.screenshot({
      path: '04-sweatshirts-config.png',
      fullPage: true
    })
    console.log('Screenshot saved: 04-sweatshirts-config.png')

    // Check if displayAsColumn checkbox exists
    const displayCheckbox = await page.locator('#displayAsColumn')
    if (await displayCheckbox.count() > 0) {
      // First show unchecked state (item display fields)
      await page.screenshot({
        path: '05-sweatshirts-item-fields.png',
        fullPage: true
      })
      console.log('Screenshot saved: 05-sweatshirts-item-fields.png')

      // Check it to show column fields
      console.log('Checking displayAsColumn...')
      await displayCheckbox.check()
      await page.waitForTimeout(1000)

      await page.screenshot({
        path: '06-sweatshirts-column-fields.png',
        fullPage: true
      })
      console.log('Screenshot saved: 06-sweatshirts-column-fields.png')
    }

    console.log('\nAll screenshots captured successfully!')

  } catch (error) {
    console.error('Error:', error.message)
    await page.screenshot({
      path: 'error-final.png',
      fullPage: true
    })
    console.log('Error screenshot saved: error-final.png')
  } finally {
    await browser.close()
  }
}

captureSweatshirtsConfig()
