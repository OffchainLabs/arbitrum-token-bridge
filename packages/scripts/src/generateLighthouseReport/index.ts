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
    const { report, longTasks } = await executeLighthouseFlow(chromePath);

    const longTasksTotal = longTasks.reduce((sum, longTask) => {
      return sum + longTask.duration;
    }, 0);
    core.startGroup("Parse lighthouse report");
    const parsedReport = parseLighthouseReport(report);
    core.endGroup();

    core.startGroup("Post comment");
    const github = getOctokit(process.env.GITHUB_TOKEN || "");

    const { data: comment } = await github.rest.issues.createComment({
      ...context.repo,
      issue_number: context.issue.number,
      // Identation needs to be on the same level, otherwise github doesn't format it properly
      body: `
<details>
<summary>❌ Lighthouse: Regression found</summary>

<!-- Leave a blank line after summary, but do NOT use <br> -->

| Name                       | Result                          |
|----------------------------|---------------------------------|
| Performance                | ${parsedReport[0].performance * 100}  |
| Accessibility              | ${parsedReport[0].accessibility * 100}   |
| Best Practices             | ${parsedReport[0]["best_practices"] * 100}  |
| SEO                        | ${parsedReport[0].seo * 100}   |
| First Contentful Paint     | ${parsedReport[0].fcp.displayValue}  |
| Largest Contentful Paint   | ${parsedReport[0].lcp.displayValue}  |
| Total Blocking Time        | ${parsedReport[0].tbt.displayValue}  |
| Cumulative Layout Shift    | ${parsedReport[0].cls.displayValue}  |
| Speed Index                | ${parsedReport[0].speed.displayValue}  |
| Long tasks | ${longTasks.length} (${longTasksTotal}ms)

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
