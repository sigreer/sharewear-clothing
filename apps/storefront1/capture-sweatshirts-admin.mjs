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
      waitUntil: 'networkidle',
      timeout: 30000
    })

    await page.waitForTimeout(1000)

    // Login
    console.log('Logging in...')
    await page.fill('input[type="email"]', 's@sideways.systems')
    await page.fill('input[type="password"]', 'H5n4#Grub3r')
    await page.click('button:has-text("Continue with Email")')

    // Wait for navigation after login
    await page.waitForTimeout(3000)

    console.log('Navigating to mega-menu config...')
    await page.goto('http://sharewear.local:9000/app/catalog/mega-menu', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    await page.waitForTimeout(2000)

    // Click on the Categories tab
    console.log('Clicking Categories tab...')
    const categoriesTab = await page.locator('button:has-text("Categories")')
    await categoriesTab.click()
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: 'categories-tab-initial.png',
      fullPage: true
    })
    console.log('Screenshot saved: categories-tab-initial.png')

    // Click on the category selector
    console.log('Opening category selector...')
    await page.click('[role="combobox"]')
    await page.waitForTimeout(1000)

    // Take screenshot of selector dropdown
    await page.screenshot({
      path: 'category-selector-dropdown.png',
      fullPage: true
    })
    console.log('Screenshot saved: category-selector-dropdown.png')

    // Find and click Sweatshirts
    console.log('Searching for Sweatshirts...')
    const sweatshirtsOption = await page.locator('[role="option"]').filter({ hasText: 'Sweatshirts' })

    if (await sweatshirtsOption.count() > 0) {
      await sweatshirtsOption.first().click()
      console.log('Selected Sweatshirts category')
      await page.waitForTimeout(2000)

      // Take screenshot of configuration fields
      await page.screenshot({
        path: 'sweatshirts-config-full.png',
        fullPage: true
      })
      console.log('Screenshot saved: sweatshirts-config-full.png')

      // Scroll to show all fields
      await page.evaluate(() => {
        const container = document.querySelector('[role="main"]') || document.body
        container.scrollTop = 200
      })
      await page.waitForTimeout(500)

      await page.screenshot({
        path: 'sweatshirts-config-scrolled.png',
        fullPage: true
      })
      console.log('Screenshot saved: sweatshirts-config-scrolled.png')

      // Try to check the "Display as column" checkbox to see those fields
      const displayAsColumnCheckbox = await page.locator('input[type="checkbox"]#displayAsColumn')
      if (await displayAsColumnCheckbox.count() > 0) {
        console.log('Checking "Display as column" checkbox...')
        await displayAsColumnCheckbox.check()
        await page.waitForTimeout(1000)

        await page.screenshot({
          path: 'sweatshirts-display-as-column.png',
          fullPage: true
        })
        console.log('Screenshot saved: sweatshirts-display-as-column.png')

        // Uncheck to see the other fields
        console.log('Unchecking to show item display fields...')
        await displayAsColumnCheckbox.uncheck()
        await page.waitForTimeout(1000)

        await page.screenshot({
          path: 'sweatshirts-item-display-fields.png',
          fullPage: true
        })
        console.log('Screenshot saved: sweatshirts-item-display-fields.png')
      }

    } else {
      console.log('Sweatshirts not found in selector')
    }

  } catch (error) {
    console.error('Error:', error.message)
    await page.screenshot({
      path: 'error-screenshot-admin.png',
      fullPage: true
    })
    console.log('Error screenshot saved: error-screenshot-admin.png')
  } finally {
    await browser.close()
  }
}

captureSweatshirtsConfig()
