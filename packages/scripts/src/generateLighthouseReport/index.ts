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

    //     core.setOutput("img", report);
    //     if (!report) {
    //       core.setFailed("Report wasn't generated");
    //       throw new Error("Report wasn't generated");
    //     }

    //     core.startGroup("Parse lighthouse report");
    //     const parsedReport = parseLighthouseReport(report);
    //     core.endGroup();

    //     core.startGroup("Post comment");
    //     const github = getOctokit(process.env.GITHUB_TOKEN || "");
    //     // const octokit = getOctokit(core.getInput("token"));

    //     const { data: comment } = await github.rest.issues.createComment({
    //       ...context.repo,
    //       issue_number: context.issue.number,
    //       body: `<details>
    //   <summary>❌ Lighthouse: Regression found </summary>

    // <br>

    // <!-- use a blank line and then Markdown table below -->

    // | Name                     | Result | Regression |
    // |--------------------------|--------|------------|
    // | Performance              | 30     | yes ❌       |
    // | Accessibility            | 90     | no ✅       |
    // | Best Practices           | 90     | no ✅       |
    // | SEO                      | 90     | no ✅       |
    // | First Contentful Paint   | 1.1s   | no ✅       |
    // | Largest Contentful Paint | 2s     | yes ❌       |
    // | Total Blocking Time      | 2s     | yes ❌       |
    // | Cumulative Layout Shift  | 0.0015s| yes ✅       |
    // | Speed Index              | 25     | yes ❌       |

    // </details>`,
    //     });

    //     core.info(
    //       `Created comment id '${comment.id}' on issue '${context.issue.number}'.`
    //     );
    core.endGroup();
  } catch (error) {
    console.log(error);
  }
}
