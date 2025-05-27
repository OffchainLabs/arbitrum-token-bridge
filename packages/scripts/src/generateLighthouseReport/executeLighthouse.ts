import puppeteer, { BoundingBox } from "puppeteer";
import * as core from "@actions/core";
import { startFlow, desktopConfig } from "lighthouse";

export async function executeLighthouseFlow(chromePath?: string) {
  try {
    core.startGroup("Lighthouse execution");
    // Setup the browser and Lighthouse.
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox"],
      dumpio: true,
      ...(chromePath ? { executablePath: chromePath } : {}),
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // await page.goto(
    //   "http://localhost:3000/?sourceChain=ethereum&destinationChain=arbitrum-one&tab=bridge",
    //   { waitUntil: "networkidle0", timeout: 60_000 }
    // );

    const flow = await startFlow(page, {
      config: desktopConfig,
    });

    await flow.navigate(
      "http://localhost:3000/?sourceChain=ethereum&destinationChain=arbitrum-one&tab=bridge"
    );

    // const screenshot = await page.screenshot({
    //   encoding: "base64",
    //   fullPage: true,
    // });
    // return screenshot;
    // core.setOutput("image", JSON.stringify(screenshot, null, 2));

    await flow.startTimespan();

    // Accept ToS
    const tosButton = await page.waitForSelector(
      '[aria-label="Agree to Terms and Continue"]'
    );
    await tosButton?.click();

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
    const usdcButton = await page.waitForSelector(
      '[aria-label="Select USDC.e"]'
    );
    await usdcButton?.click();
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
    const file = JSON.stringify(await flow.createFlowResult(), null, 2);
    // const file = await flow.createFlowResult();
    // Cleanup.
    await browser.close();
    core.endGroup();
    // return file;
  } catch (error) {
    console.log(error);
    core.setFailed(error);
  }
}

executeLighthouseFlow();
