import { FlowResult, Result } from "lighthouse";
import * as core from "@actions/core";

type Metric = {
  /** Number from 0 to 1 */
  score: number;
  numericValue: string;
  displayValue: string;
  scoringOptions: {
    p10: number;
    median: number;
  };
};
type NavigationResult = {
  fcp: Metric;
  lcp: Metric;
  tbt: Metric;
  cls: Metric;
  speed: Metric;
  performance: number;
  accessibility: number;
  best_practices: number;
  seo: number;
};
type TimespanResult = {
  performance: {
    total: number;
    tbt: Metric;
    cls: Metric;
    inp: {
      score: number;
      numericValue: number;
      displayValue: string;
    };
  };
  best_practices: number;
  longTasks: {
    total: number;
    durationMs: number;
  };
};
type SnapshotResult = {
  performance: number;
  accessibility: number;
  best_practices: number;
  seo: Result;
};

function commonParse(result: FlowResult.Step): {
  fcp: Metric;
  lcp: Metric;
  tbt: Metric;
  cls: Metric;
  speed: Metric;
} {
  const fcp = result.lhr.audits["first-contentful-paint"];
  const lcp = result.lhr.audits["largest-contentful-paint"];
  const tbt = result.lhr.audits["total-blocking-time"];
  const cls = result.lhr.audits["first-contentful-paint"];
  const speed = result.lhr.audits["speed-index"];

  return {
    fcp: {
      score: fcp.score!,
      displayValue: fcp.displayValue!,
      numericValue: fcp.numericUnit!,
      scoringOptions: fcp.scoringOptions!,
    },
    lcp: {
      score: lcp.score!,
      displayValue: lcp.displayValue!,
      numericValue: lcp.numericUnit!,
      scoringOptions: lcp.scoringOptions!,
    },
    tbt: {
      score: tbt.score!,
      displayValue: tbt.displayValue!,
      numericValue: tbt.numericUnit!,
      scoringOptions: tbt.scoringOptions!,
    },
    cls: {
      score: cls.score!,
      displayValue: cls.displayValue!,
      numericValue: cls.numericUnit!,
      scoringOptions: cls.scoringOptions!,
    },
    speed: {
      score: speed.score!,
      displayValue: speed.displayValue!,
      numericValue: speed.numericUnit!,
      scoringOptions: speed.scoringOptions!,
    },
  };
}

function parseNavigationResult(
  navigationResult: FlowResult.Step
): NavigationResult {
  const { fcp, lcp, tbt, cls, speed } = commonParse(navigationResult);
  return {
    fcp,
    lcp,
    tbt,
    cls,
    speed,
    performance: navigationResult.lhr.categories.performance.score!,
    accessibility: navigationResult.lhr.categories.accessibility.score!,
    best_practices: navigationResult.lhr.categories["best-practices"].score!,
    seo: navigationResult.lhr.categories.seo.score!,
  };
}

function parseTimespanResult(timespanResult: FlowResult.Step): TimespanResult {
  const { tbt, cls } = commonParse(timespanResult);
  const longTasks = (
    timespanResult.lhr.audits["long-tasks"].details! as unknown as {
      items: {
        url: string;
        duration: number;
        startTime: number;
      }[];
    }
  ).items;

  const inp = timespanResult.lhr.audits["interaction-to-next-paint"];
  return {
    performance: {
      total: timespanResult.lhr.categories.performance.score!,
      tbt,
      cls,
      inp: {
        score: inp.score!,
        numericValue: inp.numericValue!,
        displayValue: inp.displayValue!,
      },
    },
    best_practices: timespanResult.lhr.categories.best_practices.score!,
    longTasks: {
      total: longTasks.length,
      durationMs: longTasks.reduce((sum, task) => sum + task.duration, 0),
    },
  };
}

export function parseLighthouseReport(
  report: FlowResult
): [NavigationResult, TimespanResult] {
  core.info("Parsing navigation result");
  const navigationResult = parseNavigationResult(report.steps[0]);
  core.info("Parsing timespan result");
  const timespanResult = parseNavigationResult(report.steps[0]);
  core.info("Parsing executed");
  return [
    parseNavigationResult(report.steps[0]),
    parseTimespanResult(report.steps[1]),
  ] as const;
}
