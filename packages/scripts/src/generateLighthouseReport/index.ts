import * as core from "@actions/core";
import { executeLighthouseFlow } from "./executeLighthouse";
import {
  NavigationResult,
  parseLighthouseReports,
  SnapshotResult,
  TimespanResult,
} from "./parseLighthouseReports";
import { join, resolve } from "path";
import { config } from "../../../../package.json";
import { postComment } from "./postComment";
import { compareLighthouseReports } from "./compareLighthouseReports";
import lighthouseBaseline from "./lighthouseBaseline.json";

const workspaceRoot = resolve(process.cwd(), "../..");
// "node_modules/.cache/synpress/chrome/linux-128.0.6613.137/chrome-linux64/chrome"
const chromePath = join(
  workspaceRoot,
  config.chromePath,
  `/chrome/linux-${config.chromeVersion}`,
  "chrome-linux64/chrome"
);
export async function generateLighthouseReport() {
  try {
    // Reports need to be run sequentially
    const report1 = await executeLighthouseFlow(chromePath);
    const report2 = await executeLighthouseFlow(chromePath);
    const report3 = await executeLighthouseFlow(chromePath);

    core.startGroup("Parse lighthouse report");
    const [parsedNavigationReport, parsedTimespanReport, parsedSnapshotReport] =
      parseLighthouseReports([report1, report2, report3]);
    core.endGroup();

    core.setOutput("parsedNavigationReport", parsedNavigationReport);
    core.startGroup("Compare lighthouse results");
    const diff = await compareLighthouseReports({
      prevReport: lighthouseBaseline as [
        NavigationResult,
        TimespanResult,
        SnapshotResult
      ],
      results: [
        parsedNavigationReport,
        parsedTimespanReport,
        parsedSnapshotReport,
      ],
    });
    core.endGroup();

    await postComment({
      parsedNavigationReport,
      parsedTimespanReport,
      parsedSnapshotReport,
      ...diff,
    });
  } catch (error) {
    console.log(error);
  }
}
