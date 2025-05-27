import * as core from "@actions/core";
import { getOctokit, context } from "@actions/github";
import { executeLighthouseFlow } from "./executeLighthouse";
import { parseLighthouseReport } from "./parseLighthouseReport";
import { join, resolve } from "path";
import { config } from "../../../../package.json";

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
    const report = await executeLighthouseFlow(chromePath);

    core.startGroup("Parse lighthouse report");
    const parsedReport = parseLighthouseReport(report);
    core.endGroup();

    core.startGroup("Post comment");
    const github = getOctokit(process.env.GITHUB_TOKEN || "");

    core.info(`perfscore: ${parsedReport[0].performance.toString()}`);
    const { data: comment } = await github.rest.issues.createComment({
      ...context.repo,
      issue_number: context.issue.number,
      body: `<details>
      <summary>❌ Lighthouse: Regression found </summary>

    <br>

    <!-- use a blank line and then Markdown table below -->

    | Name                     | Result |
    |--------------------------|--------|
    | Performance     | ${parsedReport[0].performance}  |
    | Accessibility     | ${parsedReport[0].accessibility}   |
    | Best Practices    | ${parsedReport[0]["best_practices"]}  |
    | SEO     | ${parsedReport[0].seo}   |
    | First Contentful Paint     | ${parsedReport[0].fcp.displayValue}  |
    | Largest Contentful Paint     | ${parsedReport[0].cls.displayValue}  |
    | Total Blocking Time     | ${parsedReport[0].tbt.displayValue}  |
    | Cumulative Layout Shift     | ${parsedReport[0].cls.displayValue}  |
    | Speed Index     | ${parsedReport[0].speed.displayValue}  |

    </details>`,
    });

    core.info(
      `Created comment id '${comment.id}' on issue '${context.issue.number}'.`
    );
    core.endGroup();
  } catch (error) {
    console.log(error);
  }
}
