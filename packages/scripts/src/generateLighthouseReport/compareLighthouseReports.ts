import {
  NavigationResult,
  SnapshotResult,
  TimespanResult,
} from "./parseLighthouseReports";
import { parseToFixedNumber } from "./parseToFixedNumber";

export async function compareLighthouseReports({
  prevReport,
  results,
}: {
  prevReport: [NavigationResult, TimespanResult, SnapshotResult];
  results: [NavigationResult, TimespanResult, SnapshotResult];
}): Promise<{
  navigationDiff: NavigationResult;
  timespanDiff: TimespanResult;
  snapshotDiff: SnapshotResult;
}> {
  // Compare Navigation Results
  const prevNavigationResult = prevReport[0];
  const navigationResult = results[0];
  const navigationDiff = {
    fcp: {
      numericValue: parseToFixedNumber(
        prevNavigationResult.fcp.numericValue -
          navigationResult.fcp.numericValue,
        3
      ),
      score: parseToFixedNumber(
        prevNavigationResult.fcp.score - navigationResult.fcp.score,
        2
      ),
    },
    lcp: {
      numericValue: parseToFixedNumber(
        prevNavigationResult.lcp.numericValue -
          navigationResult.lcp.numericValue,
        3
      ),
      score: parseToFixedNumber(
        prevNavigationResult.lcp.score - navigationResult.lcp.score,
        2
      ),
    },
    tbt: {
      numericValue: parseToFixedNumber(
        prevNavigationResult.tbt.numericValue -
          navigationResult.tbt.numericValue,
        3
      ),
      score: parseToFixedNumber(
        prevNavigationResult.tbt.score - navigationResult.tbt.score,
        2
      ),
    },
    cls: {
      numericValue: parseToFixedNumber(
        prevNavigationResult.cls.numericValue -
          navigationResult.cls.numericValue,
        3
      ),
      score: parseToFixedNumber(
        prevNavigationResult.cls.score - navigationResult.cls.score,
        2
      ),
    },
    speed: {
      numericValue: parseToFixedNumber(
        prevNavigationResult.speed.numericValue -
          navigationResult.speed.numericValue,
        3
      ),
      score: parseToFixedNumber(
        prevNavigationResult.speed.score - navigationResult.speed.score,
        2
      ),
    },
    performance: parseToFixedNumber(
      prevNavigationResult.performance - navigationResult.performance,
      2
    ),
    accessibility: parseToFixedNumber(
      prevNavigationResult.accessibility - navigationResult.accessibility,
      2
    ),
    best_practices: parseToFixedNumber(
      prevNavigationResult.best_practices - navigationResult.best_practices,
      2
    ),
    seo: parseToFixedNumber(prevNavigationResult.seo - navigationResult.seo, 2),
    bundle_size: {
      numericValue: parseToFixedNumber(
        prevNavigationResult.bundle_size.numericValue -
          navigationResult.bundle_size.numericValue,
        3
      ),
      score: parseToFixedNumber(
        prevNavigationResult.bundle_size.score -
          navigationResult.bundle_size.score,
        2
      ),
    },
  } satisfies NavigationResult;

  // Compare Timespan Results
  const prevTimespanResult = prevReport[1];
  const timespanResult = results[1];
  const timespanDiff = {
    tbt: {
      numericValue: parseToFixedNumber(
        prevTimespanResult.tbt.numericValue - timespanResult.tbt.numericValue,
        3
      ),
      score: parseToFixedNumber(
        prevTimespanResult.tbt.score - timespanResult.tbt.score,
        2
      ),
    },
    cls: {
      numericValue: parseToFixedNumber(
        prevTimespanResult.cls.numericValue - timespanResult.cls.numericValue,
        3
      ),
      score: parseToFixedNumber(
        prevTimespanResult.cls.score - timespanResult.cls.score,
        2
      ),
    },
    inp: {
      numericValue: parseToFixedNumber(
        prevTimespanResult.inp.numericValue - timespanResult.inp.numericValue,
        3
      ),
      score: parseToFixedNumber(
        prevTimespanResult.inp.score - timespanResult.inp.score,
        2
      ),
    },
    best_practices: parseToFixedNumber(
      prevTimespanResult.best_practices - timespanResult.best_practices,
      2
    ),
    longTasks: {
      durationMs: parseToFixedNumber(
        prevTimespanResult.longTasks.durationMs -
          timespanResult.longTasks.durationMs,
        3
      ),
      total: parseToFixedNumber(
        prevTimespanResult.longTasks.total - timespanResult.longTasks.total,
        2
      ),
    },
    performance: parseToFixedNumber(
      prevTimespanResult.performance - timespanResult.performance,
      2
    ),
  } satisfies TimespanResult;

  // Compare Snapshot Result
  const prevSnapshotResult = prevReport[2];
  const snapshotResult = results[2];
  const snapshotDiff = {
    performance: parseToFixedNumber(
      prevSnapshotResult.performance - snapshotResult.performance,
      2
    ),
    accessibility: parseToFixedNumber(
      prevSnapshotResult.accessibility - snapshotResult.accessibility,
      2
    ),
    best_practices: parseToFixedNumber(
      prevSnapshotResult.best_practices - snapshotResult.best_practices,
      2
    ),
    seo: parseToFixedNumber(prevSnapshotResult.seo - snapshotResult.seo, 2),
  } satisfies SnapshotResult;

  return {
    navigationDiff,
    timespanDiff,
    snapshotDiff,
  };
}
