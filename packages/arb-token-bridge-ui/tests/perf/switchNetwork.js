import puppeteer from 'puppeteer'
import { writeFileSync } from 'fs'
import { startFlow, desktopConfig } from 'lighthouse'

// Setup the browser and Lighthouse.
const browser = await puppeteer.launch({ headless: false })
const page = await browser.newPage()

const flow = await startFlow(page, {
  config: desktopConfig
})

await flow.navigate(
  'http://localhost:3000/?destinationChain=arbitrum-one&sourceChain=ethereum'
)

await flow.startTimespan()

// Accept ToS
await page.click('[aria-label="Agree to Terms and Continue"]')

// Type amount
const input = await page.waitForSelector('[aria-label="Amount input"]')
await input?.type('2')
await page.waitForSelector('[aria-label="Route arbitrum"]')

// Switch network
await page.click('[aria-label="Switch Networks"]')
await page.waitForSelector("[aria-label='From Arbitrum One']")

// Open token selection
await page.click("[aria-label='Select Token']")
const tokenInput = await page.waitForSelector(
  "[placeholder='Search by token name, symbol, or address']"
)
await tokenInput?.type('USDC')
await page.click('[aria-label="Select USDC.e"]')
await page.waitForSelector("xpath///button[contains(., 'USDC.e')]")

// Open chain selection
await page.click("[aria-label='From Arbitrum One']")
const chainInput = await page.waitForSelector(
  '[placeholder="Search a network name"]'
)
await chainInput?.type('Xai')

const xaiRow = await page.waitForSelector('[aria-label="Switch to Xai"]')
await xaiRow?.click()
await page.waitForSelector("[aria-label='From Xai']")

await flow.endTimespan()
await flow.snapshot()

// Get the comprehensive flow report.
writeFileSync('report.html', await flow.generateReport())
// Save results as JSON.
writeFileSync(
  'flow-result.json',
  JSON.stringify(await flow.createFlowResult(), null, 2)
)

// Cleanup.
await browser.close()
