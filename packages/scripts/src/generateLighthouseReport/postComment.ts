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
| Performance                | ${(parsedNavigationReport.performance * 100).toFixed(0)}  |
| Accessibility              | ${(parsedNavigationReport.accessibility * 100).toFixed(0)}   |
| Best Practices             | ${(parsedNavigationReport["best_practices"] * 100).toFixed(0)}  |
| SEO                        | ${(parsedNavigationReport.seo * 100).toFixed(0)}   |
| First Contentful Paint     | ${(parsedNavigationReport.fcp.score * 100).toFixed(0)} ((${parsedNavigationReport.fcp.numericValue.toFixed(3)})s)  |
| Largest Contentful Paint   | ${(parsedNavigationReport.lcp.score * 100).toFixed(0)} (${parsedNavigationReport.lcp.numericValue.toFixed(3)}s)  |
| Total Blocking Time        | ${(parsedNavigationReport.tbt.score * 100).toFixed(0)} (${parsedNavigationReport.tbt.numericValue.toFixed(3)}ms) |
| Cumulative Layout Shift    | ${(parsedNavigationReport.cls.score * 100).toFixed(0)} (${parsedNavigationReport.cls.numericValue.toFixed(3)}) |
| Speed Index                | ${(parsedNavigationReport.speed.score * 100).toFixed(0)} (${parsedNavigationReport.speed.numericValue.toFixed(3)}s) |


Timespan:
| Name                       | Result                          |
|----------------------------|---------------------------------|
| Performance                | ${(parsedTimespanReport.performance.total * 100).toFixed(0)}  |
| Total Blocking Time        | ${(parsedTimespanReport.performance.tbt.score * 100).toFixed(0)} (${parsedTimespanReport.performance.tbt.numericValue}ms) |
| Cumulative Layout Shift    | ${(parsedTimespanReport.performance.cls.score * 100).toFixed(0)} (${parsedTimespanReport.performance.cls.numericValue}) |
| Interaction to Next Paint  | ${(parsedTimespanReport.performance.inp.score * 100).toFixed(0)} (${parsedTimespanReport.performance.inp.numericValue}ms) |
| Best practices | ${(parsedTimespanReport.best_practices * 100).toFixed(0)} |
| Long tasks | ${(parsedTimespanReport.longTasks.total).toFixed(0)} (${(parsedTimespanReport.longTasks.durationMs).toFixed(2)}ms) |


</details>
      `,
  });

  core.info(
    `Created comment id '${comment.id}' on issue '${context.issue.number}'.`
  );
  core.endGroup();
}
