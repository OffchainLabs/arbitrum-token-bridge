import { FlowResult, Result } from "lighthouse";

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

function parse(result: FlowResult.Step, metricName: string): Metric {
  const metric = result.lhr.audits[metricName];

  return {
    score: metric.score!,
    displayValue: metric.displayValue!,
    numericValue: metric.numericUnit!,
    scoringOptions: metric.scoringOptions!,
  };
}

function parseNavigationResult(
  navigationResult: FlowResult.Step
): NavigationResult {
  const fcp = parse(navigationResult, "first-contentful-paint");
  const lcp = parse(navigationResult, "largest-contentful-paint");
  const tbt = parse(navigationResult, "total-blocking-time");
  const cls = parse(navigationResult, "cumulative-layout-shift");
  const speed = navigationResult.lhr.audits["speed-index"];

  return {
    fcp,
    lcp,
    tbt,
    cls,
    speed: {
      score: speed.score!,
      displayValue: speed.displayValue!,
      numericValue: speed.numericUnit!,
      scoringOptions: speed.scoringOptions!,
    },
    performance: navigationResult.lhr.categories.performance.score!,
    accessibility: navigationResult.lhr.categories.accessibility.score!,
    best_practices: navigationResult.lhr.categories["best-practices"].score!,
    seo: navigationResult.lhr.categories.seo.score!,
  };
}

function parseTimespanResult(timespanResult: FlowResult.Step): TimespanResult {
  const tbt = parse(timespanResult, "total-blocking-time");
  const cls = parse(timespanResult, "cumulative-layout-shift");
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
    best_practices: timespanResult.lhr.categories["best-practices"].score!,
    longTasks: {
      total: longTasks.length,
      durationMs: longTasks.reduce((sum, task) => sum + task.duration, 0),
    },
  };
}

export function parseLighthouseReport(
  report: FlowResult
): [NavigationResult, TimespanResult] {
  return [
    parseNavigationResult(report.steps[0]),
    parseTimespanResult(report.steps[1]),
  ] as const;
}
