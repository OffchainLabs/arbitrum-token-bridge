import * as core from "@actions/core";
import { getOctokit, context } from "@actions/github";
import {
  NavigationResult,
  SnapshotResult,
  TimespanResult,
} from "./parseLighthouseReports";

export async function postComment({
  parsedNavigationReport,
  parsedTimespanReport,
  parsedSnapshotReport,
  navigationDiff,
  timespanDiff,
  snapshotDiff,
}: {
  parsedNavigationReport: NavigationResult;
  parsedTimespanReport: TimespanResult;
  parsedSnapshotReport: SnapshotResult;
  navigationDiff: NavigationResult;
  timespanDiff: TimespanResult;
  snapshotDiff: SnapshotResult;
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
<summary>Lighthouse results</summary>

<!-- Leave a blank line after summary, but do NOT use <br> -->

Navigation:
| Name                       | Result                          | Delta |
|----------------------------|---------------------------------|-------|
| Performance                | ${parsedNavigationReport.performance} | ${navigationDiff.performance} |
| Accessibility              | ${parsedNavigationReport.accessibility} | ${navigationDiff.accessibility} |
| Best Practices             | ${parsedNavigationReport.best_practices} | ${navigationDiff.best_practices} |
| SEO                        | ${parsedNavigationReport.seo} | ${navigationDiff.seo} |
| First Contentful Paint     | ${parsedNavigationReport.fcp.score} (${parsedNavigationReport.fcp.numericValue} ms) | ${navigationDiff.fcp.score} (${navigationDiff.fcp.numericValue} ms) |
| Largest Contentful Paint   | ${parsedNavigationReport.lcp.score} (${parsedNavigationReport.lcp.numericValue} s) | ${navigationDiff.lcp.score} (${navigationDiff.lcp.numericValue} ms) |
| Total Blocking Time        | ${parsedNavigationReport.tbt.score} (${parsedNavigationReport.tbt.numericValue} ms) | ${navigationDiff.tbt.score} (${navigationDiff.tbt.numericValue} ms) |
| Cumulative Layout Shift    | ${parsedNavigationReport.cls.score} (${parsedNavigationReport.cls.numericValue}) | ${navigationDiff.cls.score} (${navigationDiff.cls.numericValue} ms) |
| Speed Index                | ${parsedNavigationReport.speed.score} (${parsedNavigationReport.speed.numericValue}s) | ${navigationDiff.speed.score} (${navigationDiff.speed.numericValue} ms) |
| Bundle Size                | ${parsedNavigationReport.bundle_size.score} (${parsedNavigationReport.bundle_size.numericValue} byte) | ${navigationDiff.bundle_size.score} (${navigationDiff.bundle_size.numericValue} byte) |


Timespan:
| Name                       | Result                          | Delta |
|----------------------------|---------------------------------|-------|
| Performance                | ${parsedTimespanReport.performance} |${timespanDiff.performance} |
| Total Blocking Time        | ${parsedTimespanReport.tbt.score} (${parsedTimespanReport.tbt.numericValue} ms) | ${timespanDiff.tbt.score} (${timespanDiff.tbt.numericValue} ms) | 
| Cumulative Layout Shift    | ${parsedTimespanReport.cls.score} (${parsedTimespanReport.cls.numericValue}) | ${timespanDiff.cls.score} (${timespanDiff.cls.numericValue} ms) |
| Interaction to Next Paint  | ${parsedTimespanReport.inp.score} (${parsedTimespanReport.inp.numericValue} ms) | ${timespanDiff.inp.score} (${timespanDiff.inp.numericValue} ms) |
| Best practices | ${parsedTimespanReport.best_practices} | ${timespanDiff.best_practices} |
| Long tasks | ${parsedTimespanReport.longTasks.total} (${parsedTimespanReport.longTasks.durationMs} ms) | ${timespanDiff.longTasks.total} (${timespanDiff.longTasks.durationMs} ms) |

Snapshot:
| Name                       | Result                          | Delta |
|----------------------------|---------------------------------|-------|
| Performance                | ${parsedSnapshotReport.performance}  | ${snapshotDiff.performance} |
| Accessibility              | ${parsedSnapshotReport.accessibility} | ${snapshotDiff.accessibility} |
| Best practices             | ${parsedSnapshotReport.best_practices} | ${snapshotDiff.best_practices} |
| SEO                        | ${parsedSnapshotReport.seo} | ${snapshotDiff.seo} |

</details>
      `,
  });

  core.info(
    `Created comment id '${comment.id}' on issue '${context.issue.number}'.`
  );
  core.endGroup();
}
