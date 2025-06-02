import * as core from "@actions/core";
import { executeLighthouseFlow } from "./executeLighthouse";
import { parseLighthouseReports } from "./parseLighthouseReports";
import { join, resolve } from "path";
import { config } from "../../../../package.json";
import { postComment } from "./postComment";
import { compareLighthouseReports } from "./compareLighthouseReports";

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
        "https://bibi-lighthouse.s3.us-east-1.amazonaws.com/output.json?response-content-disposition=inline&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECgaCXVzLWVhc3QtMSJHMEUCIQDYVvbsUJQBvJb4cQOGHODWFfuYratAXjcNH8JF%2FB03dgIgA7LiKokri%2Ff90eqpoXqYhBOlX1KV9Sh9tkFdPP39YJ8qvgMI8P%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARABGgw4MTMyNjQyMDc5MzYiDDdRdm5mArGn3cKXryqSAyuYl2vBajEXiTWj5zLf%2BD42ES46704LxwyjjB%2FvzQ5XlcMuQrfPjAVag3lQcofFCDC%2FSmyjfxv7smgkyHQobGrxXhXzPa4I%2B1mRM%2B6Yv8YejmIOf03FdTaFexSZ8KepBgxek%2F3qgRhLirLs7hvcPGZnglIL3hUtNLOEHoyqqpd8oYebPB7Ppi5oxA44CAHJuUrylGAIQdgY3RpikiK9NZGIHh6ISFUhVv9YsynQIr3WcZmzBWm2EHtd2l5KPyyX4tsf2Qyhvlh9otc%2B661vL1OyUIXHzxMO6YIi1HWkVFnScH%2Bn4vKMb%2Fa%2By1C13bmocWeuaqIozRyJ6siDzwyyw%2BcbAUfy9swg75kBgwtxX863JyCDJd6zc2Srtty1%2FN5QgHBkNbTU1pa4Zg7mR3Wqr2ehtwhkxiHzqL0E7UWzfLdbFMpA8k50eDdXgpSq8gT6IymDE7MSAGeZsfYF1POQ8gWR3NN3L%2B4KdrCTgajdtIlM6I2bdKKSGomQhEHxq45mwIBgQ9EXJjuGOfDcvTuc0zlXmDCx8%2FbBBjreAsM5LGbFpoubMzCdIaokI2ip76ui901uTAvyb4Cyg%2F2eP9EVQTPjDyuSuR40tzpGgL6%2F4zsClIzrx2ngOHwjLTYndGbt%2FcOYPi4AxB%2FG8zawhpdLoOtnU528JDcFbOjZfLmsJgqyh9OZHmYCo%2FRhMAf%2FS6pV4rZGOEF9sFJpKFgYUYVQRfB6JV%2BSlm78COFLIrK92XTcq2dt0Lsy1ZqdNJU%2BS4eAAlLjYoTbHh%2Fd2voT%2FymNf%2B16Rzk3%2BltLT8Qig%2FiWnOZNysXzbW0hHZNdQykAqE4gms33DRS7HKUlf7R9%2By6wOmU8TC1N9zU0DMuokPHM3nwM2Ltw56DGhFEdF1Wgn8EaejSjXqa2lHOsfivF4JqEHsV3c5hhgoo4JXfH4opqxtNJe0GT2Jba2Cppe%2F0xK%2BRN%2FCDS9N09U5lnX2RCzE%2FX8Q49eLPDpHVEMrzjNknc0GU7YkcYNIcziCCN&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIA32WSTABAFFU4Y3O7%2F20250602%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250602T151108Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=85bb9415d78efe8c430a46045ce221b9b173e3f4053bd7cd8cffb1b86358d90c",
      results: [
        parsedNavigationReport,
        parsedTimespanReport,
        parsedSnapshotReport,
      ],
    });
    core.info(JSON.stringify(diff));
    core.endGroup();

    await postComment({
      parsedNavigationReport,
      parsedTimespanReport,
      parsedSnapshotReport,
    });
  } catch (error) {
    console.log(error);
  }
}
