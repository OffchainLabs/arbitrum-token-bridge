import * as core from "@actions/core";
import * as github from "@actions/github";
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
    const octokit = github.getOctokit(core.getInput("token"));

    const { data: comment } = await octokit.rest.issues.createComment({
      ...github.context.repo,
      issue_number: github.context.issue.number,
      body: `<details>
    <summary>🗼 Click to expand performance result</summary>

    <br>

    | Name       | Result  |
    |------------|---------|
    | Performance     | 30  |
    | Accessibility     | 90  |
    | Best Practices    | 90  |
    | SEO     | 90   |
    | First Contentful Paint     | 1.1s |
    | Largest Contentful Paint     | 2s  |
    | Total Blocking Time     | 2s  |
    | Cumulative Layout Shift     | 0.0015s  |
    | Speed Index     | 25  |

    </details>`,
    });
    core.info(
      `Created comment id '${comment.id}' on issue '${github.context.issue.number}'.`
    );
    core.endGroup();
  } catch (error) {}
}
