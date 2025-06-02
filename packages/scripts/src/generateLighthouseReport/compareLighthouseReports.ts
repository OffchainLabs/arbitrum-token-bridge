import {
  NavigationResult,
  SnapshotResult,
  TimespanResult,
} from "./parseLighthouseReports";

export async function compareLighthouseReports({
  prevReportUrl,
  results,
}: {
  prevReportUrl: string;
  results: [NavigationResult, TimespanResult, SnapshotResult];
}) {
  const prevReport = (await fetch(prevReportUrl).then((response) =>
    response.json()
  )) as [NavigationResult, TimespanResult, SnapshotResult];

  // Compare Navigation Results
  const prevNavigationResult = prevReport[0];
  const navigationResult = results[0];
  const navigationDiff = {
    fcp: {
      numericValue:
        prevNavigationResult.fcp.numericValue -
        navigationResult.fcp.numericValue,
      score: prevNavigationResult.fcp.score - navigationResult.fcp.score,
    },
    lcp: {
      numericValue:
        prevNavigationResult.lcp.numericValue -
        navigationResult.lcp.numericValue,
      score: prevNavigationResult.lcp.score - navigationResult.lcp.score,
    },
    tbt: {
      numericValue:
        prevNavigationResult.tbt.numericValue -
        navigationResult.tbt.numericValue,
      score: prevNavigationResult.tbt.score - navigationResult.tbt.score,
    },
    cls: {
      numericValue:
        prevNavigationResult.cls.numericValue -
        navigationResult.cls.numericValue,
      score: prevNavigationResult.cls.score - navigationResult.cls.score,
    },
    speed: {
      numericValue:
        prevNavigationResult.speed.numericValue -
        navigationResult.speed.numericValue,
      score: prevNavigationResult.speed.score - navigationResult.speed.score,
    },
    performance:
      prevNavigationResult.performance - navigationResult.performance,
    accessibility:
      prevNavigationResult.accessibility - navigationResult.accessibility,
    best_practices:
      prevNavigationResult.best_practices - navigationResult.best_practices,
    seo: prevNavigationResult.seo - navigationResult.seo,
  } satisfies NavigationResult;

  // Compare Timespan Results
  const prevTimespanResult = prevReport[1];
  const timespanResult = results[1];
  const timespanDiff = {
    tbt: {
      numericValue:
        prevTimespanResult.tbt.numericValue - timespanResult.tbt.numericValue,
      score: prevTimespanResult.tbt.score - timespanResult.tbt.score,
    },
    cls: {
      numericValue:
        prevTimespanResult.cls.numericValue - timespanResult.cls.numericValue,
      score: prevTimespanResult.cls.score - timespanResult.cls.score,
    },
    inp: {
      numericValue:
        prevTimespanResult.inp.numericValue - timespanResult.inp.numericValue,
      score: prevTimespanResult.inp.score - timespanResult.inp.score,
    },
    best_practices:
      prevTimespanResult.best_practices - timespanResult.best_practices,
    longTasks: {
      durationMs:
        prevTimespanResult.longTasks.durationMs -
        timespanResult.longTasks.durationMs,
      total:
        prevTimespanResult.longTasks.total - timespanResult.longTasks.total,
    },
    performance: prevTimespanResult.performance - timespanResult.performance,
  } satisfies TimespanResult;

  // Compare Snapshot Result
  const prevSnapshotResult = prevReport[2];
  const snapshotResult = results[2];
  const snapshotDiff = {
    performance: prevSnapshotResult.performance - snapshotResult.performance,
    accessibility:
      prevSnapshotResult.accessibility - snapshotResult.accessibility,
    best_practices:
      prevSnapshotResult.best_practices - snapshotResult.best_practices,
    seo: prevSnapshotResult.seo - snapshotResult.seo,
  } satisfies SnapshotResult;

  return {
    navigationDiff,
    timespanDiff,
    snapshotDiff,
  };
}
