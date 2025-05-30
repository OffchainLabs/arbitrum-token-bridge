import * as core from "@actions/core";
import { getOctokit, context } from "@actions/github";
import { NavigationResult, TimespanResult } from "./parseLighthouseReports";

export async function postComment({
  parsedNavigationReport,
  parsedTimespanReport,
}: {
  parsedNavigationReport: NavigationResult;
  parsedTimespanReport: TimespanResult;
}) {
  core.startGroup("Post comment");
  const github = getOctokit(process.env.GITHUB_TOKEN || "");

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
| Performance                | ${parsedNavigationReport.performance}  |
| Accessibility              | ${parsedNavigationReport.accessibility}   |
| Best Practices             | ${parsedNavigationReport["best_practices"]}  |
| SEO                        | ${parsedNavigationReport.seo}   |
| First Contentful Paint     | ${parsedNavigationReport.fcp.score} (${parsedNavigationReport.fcp.numericValue})s)  |
| Largest Contentful Paint   | ${parsedNavigationReport.lcp.score} (${parsedNavigationReport.lcp.numericValue}s)  |
| Total Blocking Time        | ${parsedNavigationReport.tbt.score} (${parsedNavigationReport.tbt.numericValue}ms) |
| Cumulative Layout Shift    | ${parsedNavigationReport.cls.score} (${parsedNavigationReport.cls.numericValue}) |
| Speed Index                | ${parsedNavigationReport.speed.score} (${parsedNavigationReport.speed.numericValue}s) |


Timespan:
| Name                       | Result                          |
|----------------------------|---------------------------------|
| Performance                | ${parsedTimespanReport.performance}  |
| Total Blocking Time        | ${parsedTimespanReport.tbt.score} (${parsedTimespanReport.tbt.numericValue}ms) |
| Cumulative Layout Shift    | ${parsedTimespanReport.cls.score} (${parsedTimespanReport.cls.numericValue}) |
| Interaction to Next Paint  | ${parsedTimespanReport.inp.score} (${parsedTimespanReport.inp.numericValue}ms) |
| Best practices | ${parsedTimespanReport.best_practices} |
| Long tasks | ${parsedTimespanReport.longTasks.total} (${parsedTimespanReport.longTasks.durationMs}ms) |


</details>
      `,
  });

  core.info(
    `Created comment id '${comment.id}' on issue '${context.issue.number}'.`
  );
  core.endGroup();
}
