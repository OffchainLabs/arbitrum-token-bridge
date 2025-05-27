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
    // const report = await executeLighthouseFlow(chromePath);

    // console.log(report);
    // core.setOutput("img", report);
    //     if (!report) {
    //       core.setFailed("Report wasn't generated");
    //       throw new Error("Report wasn't generated");
    //     }

    //     core.startGroup("Parse lighthouse report");
    //     const parsedReport = parseLighthouseReport(report);
    //     core.endGroup();

    core.startGroup("Post comment");
    const github = getOctokit(process.env.GITHUB_TOKEN || "");
    // const octokit = getOctokit(core.getInput("token"));

    const { data: comment } = await github.rest.issues.createComment({
      ...context.repo,
      issue_number: context.issue.number,
      body: `<details>
  <summary>🗼 Click to expand performance result</summary>

<br>

<!-- use a blank line and then Markdown table below -->

| Name                     | Result |
|--------------------------|--------|
| Performance              | 30     |
| Accessibility            | 90     |
| Best Practices           | 90     |
| SEO                      | 90     |
| First Contentful Paint   | 1.1s   |
| Largest Contentful Paint | 2s     |
| Total Blocking Time      | 2s     |
| Cumulative Layout Shift  | 0.0015s|
| Speed Index              | 25     |

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
