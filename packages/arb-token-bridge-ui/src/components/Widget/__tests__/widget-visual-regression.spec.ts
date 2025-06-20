import { test, expect, chromium, Browser, Page } from '@playwright/test'

test.describe('Widget UI Snapshot Test', () => {
  let browser: Browser
  let page: Page

  test.beforeAll(async () => {
    browser = await chromium.launch()
    page = await browser.newPage()
  })

  test.afterAll(async () => {
    await browser.close()
  })

  async function takeWidgetScreenshot(
    width: number,
    height: number,
    orientation: string
  ) {
    // Set viewport size
    await page.setViewportSize({ width, height })

    // Navigate to the widget URL
    await page.goto(
      'http://localhost:3000/?embedMode=1&sourceChain=sepolia&destinationChain=arbitrum-sepolia'
    )

    // Wait for widget to load
    await page.waitForSelector('.widget-content', { timeout: 5_000 })

    // Wait for animations to complete
    await page.waitForTimeout(5_000)

    // Take snapshot
    expect(await page.screenshot()).toMatchSnapshot(
      `widget-${orientation}-orientation-${width}x${height}.png`,
      { threshold: 0.2 }
    )
  }

  test('should match snapshot for widget in horizontal mode (910x430)', async () => {
    await takeWidgetScreenshot(910, 430, 'horizontal')
  })

  test('should match snapshot for widget in vertical mode (441x740)', async () => {
    await takeWidgetScreenshot(441, 740, 'vertical')
  })
})
