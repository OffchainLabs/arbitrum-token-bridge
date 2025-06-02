import { FlowResult } from "lighthouse";
import {
  NavigationResult,
  parseLighthouseReports,
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
  )) as FlowResult;

  const [
    prevParsedNavigationReport,
    prevParsedTimespanReport,
    prevParsedSnapshotReport,
  ] = parseLighthouseReports([prevReport]);

  // Compare Navigation Results
  const navigationResult = results[0];
  const navigationDiff = {
    fcp: {
      numericValue:
        prevParsedNavigationReport.fcp.numericValue -
        navigationResult.fcp.numericValue,
      score: prevParsedNavigationReport.fcp.score - navigationResult.fcp.score,
    },
    lcp: {
      numericValue:
        prevParsedNavigationReport.lcp.numericValue -
        navigationResult.lcp.numericValue,
      score: prevParsedNavigationReport.lcp.score - navigationResult.lcp.score,
    },
    tbt: {
      numericValue:
        prevParsedNavigationReport.tbt.numericValue -
        navigationResult.tbt.numericValue,
      score: prevParsedNavigationReport.tbt.score - navigationResult.tbt.score,
    },
    cls: {
      numericValue:
        prevParsedNavigationReport.cls.numericValue -
        navigationResult.cls.numericValue,
      score: prevParsedNavigationReport.cls.score - navigationResult.cls.score,
    },
    speed: {
      numericValue:
        prevParsedNavigationReport.speed.numericValue -
        navigationResult.speed.numericValue,
      score:
        prevParsedNavigationReport.speed.score - navigationResult.speed.score,
    },
    performance:
      prevParsedNavigationReport.performance - navigationResult.performance,
    accessibility:
      prevParsedNavigationReport.accessibility - navigationResult.accessibility,
    best_practices:
      prevParsedNavigationReport.best_practices -
      navigationResult.best_practices,
    seo: prevParsedNavigationReport.seo - navigationResult.seo,
  } satisfies NavigationResult;

  // Same for timespan result and snapshot result
  const timespanResult = results[1];
  const timespanDiff = {
    tbt: {
      numericValue:
        prevParsedTimespanReport.tbt.numericValue -
        timespanResult.tbt.numericValue,
      score: prevParsedTimespanReport.tbt.score - timespanResult.tbt.score,
    },
    cls: {
      numericValue:
        prevParsedTimespanReport.cls.numericValue -
        timespanResult.cls.numericValue,
      score: prevParsedTimespanReport.cls.score - timespanResult.cls.score,
    },
    inp: {
      numericValue:
        prevParsedTimespanReport.inp.numericValue -
        timespanResult.inp.numericValue,
      score: prevParsedTimespanReport.inp.score - timespanResult.inp.score,
    },
    best_practices:
      prevParsedTimespanReport.best_practices - timespanResult.best_practices,
    longTasks: {
      durationMs:
        prevParsedTimespanReport.longTasks.durationMs -
        timespanResult.longTasks.durationMs,
      total:
        prevParsedTimespanReport.longTasks.total -
        timespanResult.longTasks.total,
    },
    performance:
      prevParsedTimespanReport.performance - timespanResult.performance,
  } satisfies TimespanResult;

  const snapshotResult = results[2];
  const snapshotDiff = {
    performance:
      prevParsedSnapshotReport.performance - snapshotResult.performance,
    accessibility:
      prevParsedSnapshotReport.accessibility - snapshotResult.accessibility,
    best_practices:
      prevParsedSnapshotReport.best_practices - snapshotResult.best_practices,
    seo: prevParsedSnapshotReport.seo - snapshotResult.seo,
  } satisfies SnapshotResult;

  return {
    navigationDiff,
    timespanDiff,
    snapshotDiff,
  };
}
