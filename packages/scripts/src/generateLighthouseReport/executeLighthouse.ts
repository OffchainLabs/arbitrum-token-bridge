import puppeteer from "puppeteer";
import * as core from "@actions/core";
import { startFlow, desktopConfig } from "lighthouse";
import { join, resolve } from "path";
import { config } from "../../../../package.json";

const workspaceRoot = resolve(process.cwd(), "../..");
export async function executeLighthouseFlow() {
  try {
    core.startGroup("Lighthouse execution");
    // Setup the browser and Lighthouse.
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox"],
      // "node_modules/.cache/synpress/chrome/linux-128.0.6613.137/chrome-linux64/chrome"
      executablePath: join(
        workspaceRoot,
        config.chromePath,
        `/chrome/linux-${config.chromeVersion}`,
        "chrome-linux64/chrome"
      ),
    });
    const page = await browser.newPage();

    const flow = await startFlow(page, {
      config: desktopConfig,
    });

    // Exact URL, we don't want redirection that would change the result
    await flow.navigate(
      "http://localhost:3000/?sourceChain=ethereum&destinationChain=arbitrum-one&tab=bridge"
    );

    const screenshot = page.screenshot();
    core.setOutput("image", JSON.stringify(screenshot, null, 2));

    await flow.startTimespan();

    // Accept ToS
    await page.click('[aria-label="Agree to Terms and Continue"]');

    // Type amount
    const input = await page.waitForSelector('[aria-label="Amount input"]');
    await input?.type("2");
    await page.waitForSelector('[aria-label="Route arbitrum"]');

    // Switch network
    await page.click('[aria-label="Switch Networks"]');
    await page.waitForSelector("[aria-label='From Arbitrum One']");

    // Open token selection
    await page.click("[aria-label='Select Token']");
    const tokenInput = await page.waitForSelector(
      "[placeholder='Search by token name, symbol, or address']"
    );
    await tokenInput?.type("USDC");
    await page.click('[aria-label="Select USDC.e"]');
    await page.waitForSelector("xpath///button[contains(., 'USDC.e')]");

    // Open chain selection
    await page.click("[aria-label='From Arbitrum One']");
    const chainInput = await page.waitForSelector(
      '[placeholder="Search a network name"]'
    );
    await chainInput?.type("Xai");

    const xaiRow = await page.waitForSelector('[aria-label="Switch to Xai"]');
    await xaiRow?.click();
    await page.waitForSelector("[aria-label='From Xai']");

    await flow.endTimespan();
    await flow.snapshot();

    // Get the comprehensive flow report.
    // writeFileSync("report.html", await flow.generateReport());
    // Save results as JSON.
    // const file = JSON.stringify(await flow.createFlowResult(), null, 2);
    const file = await flow.createFlowResult();
    // Cleanup.
    await browser.close();
    core.endGroup();
    return file;
  } catch (error) {
    console.log(error);
    core.setFailed(error);
  }
}
