import * as core from "@actions/core";
import * as github from "@actions/github";
import { executeLighthouseFlow } from "./executeLighthouse";
import { parseLighthouseReport } from "./parseLighthouseReport";

export async function generateLighthouseReport() {
  try {
    const report = await executeLighthouseFlow();

    console.log(report);
    core.setOutput("img", report);
    //     if (!report) {
    //       core.setFailed("Report wasn't generated");
    //       throw new Error("Report wasn't generated");
    //     }

    //     core.startGroup("Parse lighthouse report");
    //     const parsedReport = parseLighthouseReport(report);
    //     core.endGroup();

    //     core.startGroup("Post comment");
    //     const octokit = github.getOctokit(core.getInput("token"));

    //     const { data: comment } = await octokit.rest.issues.createComment({
    //       ...github.context.repo,
    //       issue_number: github.context.issue.number,
    //       body: `<details>
    // <summary>🗼 Click to expand performance result</summary>

    // <br>

    // | Name       | Result  |
    // |------------|---------|
    // | Performance     | ${parsedReport[0].performance}  |
    // | Accessibility     | ${parsedReport[0].accessibility}   |
    // | Best Practices    | ${parsedReport[0]["best_practices"]}  |
    // | SEO     | ${parsedReport[0].seo}   |
    // | First Contentful Paint     | ${parsedReport[0].fcp.displayValue}  |
    // | Largest Contentful Paint     | ${parsedReport[0].cls.displayValue}  |
    // | Total Blocking Time     | ${parsedReport[0].tbt.displayValue}  |
    // | Cumulative Layout Shift     | ${parsedReport[0].cls.displayValue}  |
    // | Speed Index     | ${parsedReport[0].speed.displayValue}  |

    // </details>`,
    //     });
    //     core.info(
    //       `Created comment id '${comment.id}' on issue '${github.context.issue.number}'.`
    //     );
    //     core.endGroup();
  } catch (error) {}
}
