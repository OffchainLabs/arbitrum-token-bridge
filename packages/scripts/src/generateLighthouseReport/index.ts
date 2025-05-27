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
    const [parsedNavigationReport, parsedTimespanReport] =
      parseLighthouseReport(report);
    core.endGroup();

    core.startGroup("Post comment");
    const github = getOctokit(process.env.GITHUB_TOKEN || "");

    core.info(JSON.stringify(parsedNavigationReport));
    // core.info(JSON.stringify(parsedTimespanReport));
    const { data: comment } = await github.rest.issues.createComment({
      ...context.repo,
      issue_number: context.issue.number,
      // Identation needs to be on the same level, otherwise github doesn't format it properly
      // prettier-ignore
      body: `
<details>
<summary>❌ Lighthouse: Regression found</summary>

<!-- Leave a blank line after summary, but do NOT use <br> -->

Navigation:
| Name                       | Result                          |
|----------------------------|---------------------------------|
| Performance                | ${parsedNavigationReport.performance * 100}  |
| Accessibility              | ${parsedNavigationReport.accessibility * 100}   |
| Best Practices             | ${parsedNavigationReport["best_practices"] * 100}  |
| SEO                        | ${parsedNavigationReport.seo * 100}   |
| First Contentful Paint     | ${parsedNavigationReport.fcp.score * 100} (${parsedNavigationReport.fcp.displayValue})  |
| Largest Contentful Paint   | ${parsedNavigationReport.lcp.score * 100} (${parsedNavigationReport.lcp.displayValue})  |
| Total Blocking Time        | ${parsedNavigationReport.tbt.score * 100} (${parsedNavigationReport.tbt.displayValue}) |
| Cumulative Layout Shift    | ${parsedNavigationReport.cls.score * 100} (${parsedNavigationReport.cls.displayValue}) |
| Speed Index                | ${parsedNavigationReport.speed.score * 100} (${parsedNavigationReport.speed.displayValue}) |

</details>
      `,
    });

    core.info(
      `Created comment id '${comment.id}' on issue '${context.issue.number}'.`
    );
    core.endGroup();
  } catch (error) {
    console.log(error);
  }
}
