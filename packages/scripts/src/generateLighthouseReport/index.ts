import * as core from "@actions/core";
import { executeLighthouseFlow } from "./executeLighthouse";
import { parseLighthouseReports } from "./parseLighthouseReports";
import { join, resolve } from "path";
import { config } from "../../../../package.json";
import { postComment } from "./postComment";
import { compareLighthouseReports } from "./compareLighthouseReports";
import { DefaultArtifactClient } from "@actions/artifact";

const artifact = new DefaultArtifactClient();
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
    // Reports need to be run sequentially
    const report1 = await executeLighthouseFlow(chromePath);
    const report2 = await executeLighthouseFlow(chromePath);
    const report3 = await executeLighthouseFlow(chromePath);

    core.startGroup("Parse lighthouse report");
    const [parsedNavigationReport, parsedTimespanReport, parsedSnapshotReport] =
      parseLighthouseReports([report1, report2, report3]);
    core.endGroup();

    core.startGroup("Compare lighthouse results");
    const diff = await compareLighthouseReports({
      prevReportUrl:
        "https://bibi-lighthouse.s3.us-east-1.amazonaws.com/output.json?response-content-disposition=inline&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECgaCXVzLWVhc3QtMSJIMEYCIQCSGvEtdDdPH1t3CSYZj0t%2Bb7m3EasIGenn2%2FzKMyKjKQIhAJv8f%2F%2Fb0hCmhoZdfuYyUR1X7L%2Fr%2BjsGsEuGiHSCM9boKr4DCPH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMODEzMjY0MjA3OTM2IgyhGGjJi9Y8htvZwjUqkgMd4rnuSYrl%2Bawn%2F9DT3sIqywosdN9VbqqmWdFjrMzeys3jXwRwt1ii5OHCzd3AaHnUJJgFMdc%2BDn%2FuLaR0Z4QyD9nVUkZ2mkRWCaOIy%2BHF5GBL1OgGGHCDcdnBgJFpx28m8MCC3YQ%2BOOsnR4qD0I1RPpBZ%2B0%2B50KsZdM%2FS1%2BPxkCEfPqcquDkpiriraIFG0bSGODM3gzzeja4H9kLFgkPeWRyp82948sadxncs%2B%2FHgLdaABrsnQayofemGHw%2BjanE3dYWiabMz7OBCL4uarocdXkDFlnRy53PX06deS75XSrbzgzKGxTXAX8xfJ2g0BVLsMkEjbGmdX17NRjMjlf1qzPaApXo4FXGZl%2FSVhRlb%2BkR9uwbiykX4bSNHolIVxYd3VOMHDIJIQrafy7f6XqZH5ABncG8mhatrMwdAETk1CmA7q1vtEQ2BBq2LLRpxydFCbMGVH%2FjfAtMkT%2F%2FDJ%2BKgIw6EmOQ0SVjaMq6Z6g8o8lh0h8%2BTlcfX2garKS%2FHKdush5TJa%2BK%2BU%2BUTZ1m4oNLKk%2BYwsfP2wQY63QJ506Bt0JVlGD37qHnuRLXMKuKTPcRwcMW%2BZ%2Fn87qxps%2FJrexg8qUkmPxEIJWV2FltIA52pOLCN14%2BuCq56%2FDPRHIF%2BLIBRTX9qnAzRBDkip2YMU6vxwtyAGz15BTVzvMDcRXHXrvSHTgcWjLsHug86J1gausbO%2BrTQj4EHWthiXKPVMTWmScHwpZCw%2BY95LWsbAa3kew2x7w4lAnpaY2y%2FHi1XDcxTpaJb9kAwTd1SNS3z3bigN9H1060d7M1VePjiexYk%2FRohT6rN5U7RVKQaSnlTjcqAtF5PVyvz7mukDEK3QaQaozaBwRUe8UV0Pp4IEinBEYnIRwuvZJudoGNcUFjS812lFFmNFmQeN51V96PbgXOXb8WJmWPUnrOQtpNooIbBT4Jx%2BF1v1szSqDnnsO0XknKb4nUpZVx26ZxDxPBJQ3EBPiA1phsAndN7MCjOpahkPQe7xfKKExEz&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIA32WSTABANCYDZXAQ%2F20250602%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250602T155001Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=6e4681bb5f3b431bd4f5e5801f6f31b1e5a7c7708782713d82796d11137d33c9",
      results: [
        parsedNavigationReport,
        parsedTimespanReport,
        parsedSnapshotReport,
      ],
    });
    core.endGroup();

    core.startGroup("Upload lighthouse report");
    const { id } = await artifact.uploadArtifact(
      "lhreport",
      ["./lhreport.html"],
      "."
    );
    const { downloadPath } = await artifact.downloadArtifact(id);
    core.info(`Created artifact with id: ${id}, (${downloadPath})`);
    core.endGroup();

    await postComment({
      parsedNavigationReport,
      parsedTimespanReport,
      parsedSnapshotReport,
      ...diff,
      artifactPath: downloadPath,
    });
  } catch (error) {
    console.log(error);
  }
}
