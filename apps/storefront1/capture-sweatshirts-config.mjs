import { chromium } from '@playwright/test'

async function captureSweatshirtsConfig() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  })
  const page = await context.newPage()

  try {
    console.log('Navigating to mega-menu admin page...')
    await page.goto('http://sharewear.local:9000/app/catalog/mega-menu', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // Wait for the page to load
    await page.waitForTimeout(2000)

    // Click on the Categories tab
    console.log('Clicking Categories tab...')
    await page.click('button:has-text("Categories")')
    await page.waitForTimeout(1000)

    // Click on the category selector
    console.log('Opening category selector...')
    await page.click('[role="combobox"]')
    await page.waitForTimeout(1000)

    // Take screenshot of selector
    await page.screenshot({
      path: 'category-selector.png',
      fullPage: false
    })
    console.log('Screenshot saved: category-selector.png')

    // Find and click Sweatshirts
    console.log('Searching for Sweatshirts...')
    const sweatshirtsOption = await page.locator('[role="option"]:has-text("Sweatshirts")').first()

    if (await sweatshirtsOption.count() > 0) {
      await sweatshirtsOption.click()
      console.log('Selected Sweatshirts category')
      await page.waitForTimeout(2000)

      // Take screenshot of configuration
      await page.screenshot({
        path: 'sweatshirts-config.png',
        fullPage: true
      })
      console.log('Screenshot saved: sweatshirts-config.png')

      // Scroll down to see more options
      await page.evaluate(() => window.scrollBy(0, 300))
      await page.waitForTimeout(500)

      await page.screenshot({
        path: 'sweatshirts-config-scrolled.png',
        fullPage: true
      })
      console.log('Screenshot saved: sweatshirts-config-scrolled.png')
    } else {
      console.log('Sweatshirts not found in selector')

      // Take screenshot of what's available
      await page.screenshot({
        path: 'categories-available.png',
        fullPage: true
      })
      console.log('Screenshot saved: categories-available.png')
    }

  } catch (error) {
    console.error('Error:', error.message)
    await page.screenshot({
      path: 'error-screenshot.png',
      fullPage: true
    })
    console.log('Error screenshot saved: error-screenshot.png')
  } finally {
    await browser.close()
  }
}

captureSweatshirtsConfig()
