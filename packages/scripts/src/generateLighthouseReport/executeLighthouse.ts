import puppeteer from "puppeteer";
import * as core from "@actions/core";
import { startFlow, desktopConfig } from "lighthouse";
import { writeFileSync } from "fs";
import { join, resolve } from "path";

const workspaceRoot = resolve(process.cwd(), "../..");
export async function executeLighthouseFlow(chromePath?: string) {
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

  const flow = await startFlow(page, {
    config: desktopConfig,
  });

  page.on("console", (log) => {
    core.info(`[log] ${log.text()}`);
  });

  page.on("pageError", (err) => {
    core.error(`[err] ${err}`);
  });

  await flow.navigate(
    "http://localhost:3000/?sourceChain=ethereum&destinationChain=arbitrum-one&tab=bridge&txHistory=0"
  );

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
  const usdcButton = await page.waitForSelector('[aria-label="Select USDC.e"]');
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
  const report = await flow.createFlowResult();

  core.info(join(workspaceRoot, "./lhreport.html"));
  writeFileSync(
    join(workspaceRoot, "./lhreport.html"),
    JSON.stringify(await flow.generateReport(), null, 2)
  );

  // Cleanup.
  await browser.close();
  core.endGroup();

  return report;
}
